<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Setting;
use App\Models\StockLedger;
use App\Models\WhatsappOrder;
use App\Models\Store;
use App\Support\AmountInWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    use \App\Support\PrintsCompanyHeader;

    public const PAYMENT_MODES = ['cash', 'card', 'bank_transfer', 'cheque', 'credit', 'online'];

    public function index(Request $request)
    {
        return Invoice::query()
            ->with('customer:id,name,phone,tin,address')
            ->when($request->integer('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('is_credit', $request->input('type') === 'credit'))
            ->when($request->filled('store_id'), fn ($q) => $q->where('store_id', $request->input('store_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('to')))
            ->when($request->string('search')->trim()->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search')->trim().'%';
                $q->where(fn ($q) => $q->where('invoice_no', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('customer_phone', 'like', $term)
                    ->orWhere('vehicle_no', 'like', $term)
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', $term)->orWhere('phone', 'like', $term)));
            })
            ->latest()
            ->latest('id')
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'is_credit' => ['boolean'],
            // Credit bills must be raised against a registered customer.
            'customer_id' => ['nullable', 'required_if_accepted:is_credit', 'exists:customers,id'],
            'store_id' => ['nullable', 'exists:stores,id'],
            // Bills saved while offline: when the sale happened (kept as the bill date).
            'sold_at' => ['nullable', 'date', 'before:+1 day', 'after:-30 days'],  // allows a till clock a little fast
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'vehicle_no' => ['nullable', 'string', 'max:100'],
            'vehicle_model' => ['nullable', 'string', 'max:255'],
            'vehicle_year' => ['nullable', 'string', 'max:50'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'customer_tin' => ['nullable', 'string', 'max:50'],
            'customer_address' => ['nullable', 'string', 'max:500'],
            'delivery_date' => ['nullable', 'date'],
            'place_of_supply' => ['nullable', 'string', 'max:255'],
            'payment_mode' => ['nullable', Rule::in(self::PAYMENT_MODES)],
            'additional_info' => ['nullable', 'string', 'max:1000'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            // A line is either an existing product, or a new item typed on the invoice (name + price).
            'items.*.product_id' => ['nullable', 'required_without:items.*.new_product_name', 'exists:products,id'],
            'items.*.new_product_name' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ], [
            'customer_id.required' => 'Please select a customer for this credit bill.',
            'customer_id.required_if_accepted' => 'Please select a customer for this credit bill.',
        ]);

        // The same bill sent again (a retry, or an offline bill re-uploaded) returns the first copy.
        $clientRef = $this->clientRef($request);
        if ($clientRef && ($existing = Invoice::where('client_ref', $clientRef)->first())) {
            return response()->json($existing->load('items.product', 'customer'), 200);
        }
        $offlineSale = $request->header('X-Offline-Sale') === '1';

        $invoice = DB::transaction(function () use (&$data, $request, $clientRef, $offlineSale) {
            $newItemStock = $this->createProductsFromLines($data['items'], $data['store_id'] ?? null, $request);

            foreach ($data['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                // An offline sale has already happened at the counter: record it even if stock went short.
                if (! $offlineSale && $product->stock_on_hand < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Not enough stock for {$product->name} (available: {$product->stock_on_hand})."],
                    ]);
                }
            }

            $customerId = $data['customer_id'] ?? null;
            $customerName = ! empty($data['customer_name']) ? trim($data['customer_name']) : null;
            $customerPhone = ! empty($data['customer_phone']) ? trim($data['customer_phone']) : null;
            $vehicleNo = ! empty($data['vehicle_no']) ? trim($data['vehicle_no']) : null;

            // Auto-create or resolve Customer if customer_name is provided without customer_id
            if (! $customerId && $customerName) {
                $customer = Customer::query()
                    ->when($customerPhone, fn ($q) => $q->where('phone', $customerPhone))
                    ->orWhere('name', $customerName)
                    ->first();

                if (! $customer) {
                    $customer = Customer::create([
                        'name' => $customerName,
                        'phone' => $customerPhone,
                        'vehicle_no' => $vehicleNo,
                        'is_active' => true,
                    ]);
                } else {
                    if ($vehicleNo && empty($customer->vehicle_no)) {
                        $customer->update(['vehicle_no' => $vehicleNo]);
                    }
                    if ($customerPhone && empty($customer->phone)) {
                        $customer->update(['phone' => $customerPhone]);
                    }
                }

                $customerId = $customer->id;
            }

            $subtotal = collect($data['items'])->sum(
                fn ($item) => ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0)
            );
            $discount = $data['discount'] ?? 0;
            $this->enforceDiscountLimit($data['items'], (float) $discount, $request);
            // Selling prices already include VAT: it is broken out of the total, never added on top.
            $tax = 0;
            $total = $subtotal - $discount;
            $paidAmount = min($data['paid_amount'] ?? 0, $total);
            $dueAmount = $total - $paidAmount;

            $invoice = Invoice::create([
                'invoice_no' => $this->nextInvoiceNumber(),
                'customer_id' => $customerId,
                'store_id' => $data['store_id'] ?? null,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'vehicle_no' => $vehicleNo,
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'vehicle_year' => $data['vehicle_year'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'status' => $dueAmount <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'due'),
                'is_credit' => $data['is_credit'] ?? false,
                'created_offline' => $offlineSale,
                'client_ref' => $clientRef,
                'created_by' => $request->user()->id,
            ] + $this->taxInvoiceFields($data, (float) Setting::get('tax_rate', 0), $total));

            $this->rememberCustomerTaxDetails($customerId, $data);
            $this->linkProductsToInvoice($newItemStock, $invoice);

            foreach ($data['items'] as $item) {
                $lineTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0);

                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'] ?? 0,
                    'line_total' => $lineTotal,
                ]);

                $product = Product::find($item['product_id']);

                StockLedger::create([
                    'product_id' => $item['product_id'],
                    'store_id' => $data['store_id'] ?? $product?->store_id,
                    'type' => 'sale',
                    'quantity' => -$item['quantity'],
                    'reference_type' => Invoice::class,
                    'reference_id' => $invoice->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            if ($paidAmount > 0) {
                $invoice->payments()->create([
                    'amount' => $paidAmount,
                    // payments.method allows cash / card / bank_transfer / other
                    'method' => in_array($data['payment_mode'] ?? null, ['cash', 'card', 'bank_transfer'], true)
                        ? $data['payment_mode']
                        : (($data['payment_mode'] ?? null) ? 'other' : 'cash'),
                    'paid_at' => now(),
                    'received_by' => $request->user()->id,
                ]);
            }

            if ($invoice->customer_id) {
                $invoice->customer()->increment('current_due', $dueAmount);
            }

            // Offline bills keep the time of the sale, not the time they were uploaded.
            if ($offlineSale && ! empty($data['sold_at'])) {
                $soldAt = \Illuminate\Support\Carbon::parse($data['sold_at']);
                $invoice->forceFill(['created_at' => $soldAt])->saveQuietly();
                $invoice->payments()->update(['paid_at' => $soldAt]);
            }

            return $invoice;
        });

        return response()->json($invoice->load('items.product', 'customer'), 201);
    }

    public function update(Request $request, Invoice $invoice)
    {
        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Cancelled invoices cannot be edited.'], 422);
        }

        $data = $request->validate([
            'customer_id' => [$invoice->is_credit ? 'required' : 'nullable', 'exists:customers,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'vehicle_no' => ['nullable', 'string', 'max:100'],
            'vehicle_model' => ['nullable', 'string', 'max:255'],
            'vehicle_year' => ['nullable', 'string', 'max:50'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'customer_tin' => ['nullable', 'string', 'max:50'],
            'customer_address' => ['nullable', 'string', 'max:500'],
            'delivery_date' => ['nullable', 'date'],
            'place_of_supply' => ['nullable', 'string', 'max:255'],
            'payment_mode' => ['nullable', Rule::in(self::PAYMENT_MODES)],
            'additional_info' => ['nullable', 'string', 'max:1000'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            // A line is either an existing product, or a new item typed on the invoice (name + price).
            'items.*.product_id' => ['nullable', 'required_without:items.*.new_product_name', 'exists:products,id'],
            'items.*.new_product_name' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ], [
            'customer_id.required' => 'Please select a customer for this credit bill.',
            'customer_id.required_if_accepted' => 'Please select a customer for this credit bill.',
        ]);

        $updatedInvoice = DB::transaction(function () use (&$data, $invoice, $request) {
            $newItemStock = $this->createProductsFromLines($data['items'], $invoice->store_id, $request);

            // Revert stock for existing items
            foreach ($invoice->items as $oldItem) {
                StockLedger::create([
                    'product_id' => $oldItem->product_id,
                    'type' => 'return',
                    'quantity' => $oldItem->quantity,
                    'reference_type' => Invoice::class,
                    'reference_id' => $invoice->id,
                    'created_by' => $request->user()->id,
                    'note' => 'Stock restored for invoice edit',
                ]);
            }

            // Check stock availability for new/updated items
            foreach ($data['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                if ($product->fresh()->stock_on_hand < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Not enough stock for {$product->name} (available: {$product->stock_on_hand})."],
                    ]);
                }
            }

            // Revert customer due balance if invoice had a customer
            if ($invoice->customer_id && $invoice->due_amount > 0) {
                $invoice->customer()->decrement('current_due', $invoice->due_amount);
            }

            $customerId = $data['customer_id'] ?? null;
            $customerName = ! empty($data['customer_name']) ? trim($data['customer_name']) : null;
            $customerPhone = ! empty($data['customer_phone']) ? trim($data['customer_phone']) : null;
            $vehicleNo = ! empty($data['vehicle_no']) ? trim($data['vehicle_no']) : null;

            if (! $customerId && $customerName) {
                $customer = Customer::query()
                    ->when($customerPhone, fn ($q) => $q->where('phone', $customerPhone))
                    ->orWhere('name', $customerName)
                    ->first();

                if (! $customer) {
                    $customer = Customer::create([
                        'name' => $customerName,
                        'phone' => $customerPhone,
                        'vehicle_no' => $vehicleNo,
                        'is_active' => true,
                    ]);
                }
                $customerId = $customer->id;
            }

            // Delete old line items
            $invoice->items()->delete();

            // Calculate totals
            $subtotal = collect($data['items'])->sum(
                fn ($item) => ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0)
            );
            $discount = $data['discount'] ?? 0;
            $this->enforceDiscountLimit($data['items'], (float) $discount, $request);
            // Selling prices already include VAT: it is broken out of the total, never added on top.
            $tax = 0;
            $total = $subtotal - $discount;
            $paidAmount = min($data['paid_amount'] ?? $invoice->paid_amount, $total);
            $dueAmount = $total - $paidAmount;
            $status = $dueAmount <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'due');

            $invoice->update([
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'vehicle_no' => $vehicleNo,
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'vehicle_year' => $data['vehicle_year'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'status' => $status,
            ] + $this->taxInvoiceFields($data, (float) $invoice->vat_rate, $total));

            $this->rememberCustomerTaxDetails($customerId, $data);
            $this->linkProductsToInvoice($newItemStock, $invoice);

            // Create new line items & stock ledger entries
            foreach ($data['items'] as $item) {
                $lineTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0);

                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'] ?? 0,
                    'line_total' => $lineTotal,
                ]);

                StockLedger::create([
                    'product_id' => $item['product_id'],
                    'type' => 'sale',
                    'quantity' => -$item['quantity'],
                    'reference_type' => Invoice::class,
                    'reference_id' => $invoice->id,
                    'created_by' => $request->user()->id,
                    'note' => 'Deducted for invoice edit',
                ]);
            }

            if ($invoice->customer_id && $dueAmount > 0) {
                $invoice->customer()->increment('current_due', $dueAmount);
            }

            return $invoice;
        });

        return response()->json($updatedInvoice->load('items.product', 'customer'));
    }

    public function show(Invoice $invoice)
    {
        return $invoice->load(['items.product.brand', 'items.product.vehicleBrand', 'items.product.vehicleModel', 'customer', 'payments', 'creator:id,name']);
    }

    public function void(Invoice $invoice)
    {
        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Invoice is already cancelled.'], 422);
        }

        DB::transaction(function () use ($invoice) {
            foreach ($invoice->items as $item) {
                StockLedger::create([
                    'product_id' => $item->product_id,
                    'type' => 'return',
                    'quantity' => $item->quantity,
                    'reference_type' => Invoice::class,
                    'reference_id' => $invoice->id,
                    'created_by' => request()->user()->id,
                    'note' => 'Reversed via invoice void',
                ]);
            }

            if ($invoice->customer_id) {
                $invoice->customer()->decrement('current_due', $invoice->due_amount);
            }

            $invoice->update(['status' => 'cancelled', 'due_amount' => 0]);
        });

        return response()->json($invoice->fresh(['items.product', 'customer']));
    }

    /**
     * Admin only: permanently delete an invoice in any status. Its stock movements (sales, and any
     * returns from edits or a void) are removed, which puts the stock back exactly as it was before
     * the sale; its payments go too, and an unpaid balance comes off the customer's account.
     */
    public function destroy(Request $request, Invoice $invoice)
    {
        DB::transaction(function () use ($invoice, $request) {
            $restored = StockLedger::where('reference_type', Invoice::class)
                ->where('reference_id', $invoice->id)
                ->sum('quantity');

            StockLedger::where('reference_type', Invoice::class)->where('reference_id', $invoice->id)->delete();

            // A voided invoice already took its balance off the customer; an open one has not.
            if ($invoice->status !== 'cancelled' && $invoice->customer_id && $invoice->due_amount > 0) {
                $invoice->customer()->decrement('current_due', $invoice->due_amount);
            }

            $request->attributes->set('activity', [
                'changes' => [
                    'invoice_no' => $invoice->invoice_no,
                    'status' => $invoice->status,
                    'total' => $invoice->total,
                    'customer' => $invoice->customer_name,
                    'stock_units_restored' => (int) -$restored,
                ],
            ]);

            $invoice->payments()->delete();
            $invoice->items()->delete();
            $invoice->delete();
        });

        return response()->json(null, 204);
    }

    /**
     * Download the bill as PDF: the normal bill, or (?type=vat) the tax invoice when the purchaser has a TIN.
     */
    /**
     * Delivery note / parcel label (From: us, To: the customer). The destination comes from the
     * invoice's WhatsApp order if it has one, otherwise from the invoice / customer record.
     */
    public function deliveryNote(Invoice $invoice)
    {
        $invoice->load('customer');
        $order = WhatsappOrder::where('invoice_id', $invoice->id)->latest('id')->first();

        $name = $order?->customer_name ?: ($invoice->customer_name ?: $invoice->customer?->name);
        $address = $order?->shipping_address ?: ($invoice->customer_address ?: $invoice->customer?->address);
        $phone = $order?->customer_phone ?: ($invoice->customer_phone ?: $invoice->customer?->phone);

        if (blank($name) || (blank($address) && blank($phone))) {
            return response()->json([
                'message' => 'Add the customer\'s name and an address or phone number to the invoice to print a delivery note.',
            ], 422);
        }

        $shipping = null;
        if ($order) {
            $partner = ['pickme' => 'PickMe', 'uber' => 'Uber', 'bus' => 'Bus', 'dhl' => 'DHL', 'prompt_xp' => 'Prompt XP', 'pronto' => 'Pronto', 'domex' => 'Domex'][$order->shipping_partner] ?? $order->shipping_partner;
            $detail = $order->tracking_no ?: trim(implode(' · ', array_filter([$order->bus_route, $order->vehicle_no, $order->driver_name, $order->driver_mobile])));
            $shipping = trim($partner.($detail ? " ({$detail})" : ''));
        }

        $company = $this->companyDetails();
        $pdf = Pdf::loadView('invoices.delivery', [
            'invoice' => $invoice,
            'company' => $company,
            'brands' => $this->brandLogos((string) $company['delivery_brands']),
            'recipient' => [
                'name' => $name,
                // Commas or new lines split the address over several lines on the label.
                'address_lines' => array_values(array_filter(array_map('trim', preg_split('/\r?\n|,(?=\s*[A-Za-z0-9])/', (string) $address)))),
                'phone' => $phone,
            ],
            'shipping' => $shipping,
        ])->setPaper('a5', 'portrait');

        $fileName = preg_replace('~[\\\\/:*?"<>|]+~', '-', $invoice->invoice_no);

        return $pdf->download("{$fileName}-delivery-note.pdf");
    }

    /**
     * Brands for the delivery note, each with its logo (resources/images/brands/<brand>.png) when
     * one exists, matched on the brand's first word, e.g. "Mitsubishi Motors" → mitsubishi.png.
     * Brands without a logo file print as text.
     */
    private function brandLogos(string $brands): array
    {
        return collect(explode(',', $brands))
            ->map(fn ($name) => trim($name))
            ->filter()
            ->map(function ($name) {
                $key = strtolower(preg_replace('/[^a-z0-9]/i', '', strtok($name, ' ')));
                $file = resource_path("images/brands/{$key}.png");

                return [
                    'name' => $name,
                    'logo' => is_file($file) ? 'data:image/png;base64,'.base64_encode(file_get_contents($file)) : null,
                ];
            })
            ->values()
            ->all();
    }

    public function pdf(Request $request, Invoice $invoice)
    {
        $invoice->load(['items.product.brand', 'items.product.vehicleBrand', 'items.product.vehicleModel', 'customer', 'creator:id,name']);

        // A tax invoice needs the purchaser's TIN; without one the normal bill is issued instead.
        $purchaserTin = $invoice->customer_tin ?: $invoice->customer?->tin;
        $isVat = $request->query('type') === 'vat' && filled($purchaserTin);
        $logoPath = resource_path('images/logo.png');

        $pdf = Pdf::loadView('invoices.bill', [
            'isVat' => $isVat,
            'purchaserTin' => $purchaserTin,
            'invoice' => $invoice,
            'company' => $this->companyDetails(),
            'vat' => $this->vatBreakdown($invoice),
            'paymentMode' => $invoice->payment_mode ? ucwords(str_replace('_', ' ', $invoice->payment_mode)) : null,
            'icons' => $this->billIcons(),
            'logoDataUri' => file_exists($logoPath)
                ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
                : null,
        ]);

        // Invoice numbers may contain "/" (e.g. JMINV/2026/00010), which a download file name cannot.
        $fileName = preg_replace('~[\\\\/:*?"<>|]+~', '-', $invoice->invoice_no);

        return $pdf->download($isVat ? "{$fileName}-tax-invoice.pdf" : "{$fileName}.pdf");
    }

    /**
     * Splits the VAT-inclusive bill into value of supply + VAT, line by line.
     * Line amounts are nudged by any rounding cent so they add up exactly to the value of supply.
     */
    private function vatBreakdown(Invoice $invoice): array
    {
        $rate = (float) $invoice->vat_rate;
        $total = (float) $invoice->total;
        $vatAmount = (float) $invoice->vat_amount;
        $supply = round($total - $vatAmount, 2);

        // Older bills had tax added on top, so their line prices are already VAT-exclusive.
        $factor = (float) $invoice->tax > 0 ? 1 : 1 + $rate / 100;

        $lines = $invoice->items->map(fn ($item) => [
            'item' => $item,
            'unit_excl' => round($item->unit_price / $factor, 2),
            'amount_excl' => round($item->line_total / $factor, 2),
        ])->values()->all();

        $linesSum = round(array_sum(array_column($lines, 'amount_excl')), 2);
        $discountExcl = 0.0;
        if ((float) $invoice->discount > 0) {
            $discountExcl = round($linesSum - $supply, 2);
        } elseif ($lines && $linesSum !== $supply) {
            $last = count($lines) - 1;
            $lines[$last]['amount_excl'] = round($lines[$last]['amount_excl'] + ($supply - $linesSum), 2);
        }

        return [
            'rate' => $rate,
            'lines' => $lines,
            'discount_excl' => $discountExcl,
            'supply' => $supply,
            'vat_amount' => $vatAmount,
            'total' => $total,
            'words' => AmountInWords::rupees($total),
        ];
    }

    /**
     * Lines typed on the invoice for items not in inventory become new products (source "invoice"),
     * priced at the line's selling price. The quantity sold is booked in first, so the sale's stock
     * check passes and the new item nets to zero stock. Fills in each line's product_id; returns the
     * new products and their stock entries, to be tied to the invoice once it exists.
     */
    private function createProductsFromLines(array &$items, $storeId, Request $request): array
    {
        $created = [];
        // New items go to the invoice's store if it has one, otherwise JMS-02.
        $storeId = $storeId ?: (Store::where('code', 'JMS-02')->value('id') ?? Store::value('id'));

        foreach ($items as &$item) {
            if (! empty($item['product_id']) || blank($item['new_product_name'] ?? null)) {
                continue;
            }

            $product = Product::create([
                'name' => trim($item['new_product_name']),
                'selling_price' => $item['unit_price'],
                'cost_price' => 0,
                'store_id' => $storeId,
                'unit' => 'pc',
                'reorder_level' => 0,
                'source' => 'invoice',
            ]);

            $entry = StockLedger::create([
                'product_id' => $product->id,
                'store_id' => $storeId,
                'type' => 'adjustment',
                'quantity' => $item['quantity'],
                'created_by' => $request->user()->id,
                'note' => 'New item added through an invoice',
            ]);

            $item['product_id'] = $product->id;
            $created[] = [$product, $entry];
        }
        unset($item);

        return $created;
    }

    /** Tie products created on an invoice (and their opening stock entries) to that invoice. */
    private function linkProductsToInvoice(array $created, Invoice $invoice): void
    {
        foreach ($created as [$product, $entry]) {
            $product->update(['source_invoice_id' => $invoice->id]);
            $entry->update(['reference_type' => Invoice::class, 'reference_id' => $invoice->id]);
        }
    }

    /**
     * Total discount on a bill, against the products' list (selling) prices: line discounts, the
     * bill discount, and any unit price typed below the list price. Users without the
     * "apply_discount_over_limit" permission are held to Settings → maximum discount %.
     */
    private function enforceDiscountLimit(array $items, float $billDiscount, Request $request): void
    {
        $limit = Setting::get('max_discount_percent');
        if ($limit === null || $limit === '' || $request->user()->can('apply_discount_over_limit')) {
            return;
        }

        $prices = Product::whereIn('id', collect($items)->pluck('product_id')->filter())->pluck('selling_price', 'id');
        $listTotal = 0.0;
        $charged = 0.0;
        foreach ($items as $item) {
            $listPrice = max((float) ($prices[$item['product_id']] ?? $item['unit_price']), (float) $item['unit_price']);
            $listTotal += $item['quantity'] * $listPrice;
            $charged += $item['quantity'] * $item['unit_price'] - ($item['discount'] ?? 0);
        }
        $charged -= $billDiscount;

        if ($listTotal <= 0) {
            return;
        }
        $percent = round(($listTotal - $charged) / $listTotal * 100, 2);
        if ($percent > (float) $limit + 0.001) {
            throw ValidationException::withMessages([
                'discount' => ["This bill gives a {$percent}% discount; your limit is {$limit}%. Ask a manager to approve it."],
            ]);
        }
    }

    /** The app's own reference for a bill (X-Client-Ref header), used to avoid duplicates. */
    private function clientRef(Request $request): ?string
    {
        $ref = trim((string) $request->header('X-Client-Ref'));

        return preg_match('/^[A-Za-z0-9-]{8,64}$/', $ref) ? $ref : null;
    }

    /**
     * Purchaser / delivery details plus the VAT contained in a VAT-inclusive total.
     */
    private function taxInvoiceFields(array $data, float $vatRate, float $total): array
    {
        return [
            'customer_tin' => $data['customer_tin'] ?? null,
            'customer_address' => $data['customer_address'] ?? null,
            'delivery_date' => $data['delivery_date'] ?? now()->toDateString(),
            'place_of_supply' => $data['place_of_supply'] ?? null,
            'payment_mode' => $data['payment_mode'] ?? null,
            'additional_info' => $data['additional_info'] ?? null,
            'vat_rate' => $vatRate,
            'vat_amount' => round($total * $vatRate / (100 + $vatRate), 2),
        ];
    }

    /** Keep the customer's TIN / address on file the first time a bill supplies them. */
    private function rememberCustomerTaxDetails(?int $customerId, array $data): void
    {
        $customer = $customerId ? Customer::find($customerId) : null;
        if (! $customer) {
            return;
        }

        $updates = [];
        if (! empty($data['customer_tin']) && empty($customer->tin)) {
            $updates['tin'] = $data['customer_tin'];
        }
        if (! empty($data['customer_address']) && empty($customer->address)) {
            $updates['address'] = $data['customer_address'];
        }
        if ($updates) {
            $customer->update($updates);
        }
    }

    protected function nextInvoiceNumber(): string
    {
        $row = DB::table('settings')->where('key', 'last_invoice_no')->lockForUpdate()->first();

        $next = $row ? ((int) $row->value) + 1 : 1;

        DB::table('settings')->updateOrInsert(
            ['key' => 'last_invoice_no'],
            ['value' => $next, 'updated_at' => now(), 'created_at' => now()]
        );

        $prefix = Setting::get('invoice_prefix', 'INV-');

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }
}
