<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Setting;
use App\Models\StockLedger;
use App\Support\AmountInWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public const PAYMENT_MODES = ['cash', 'card', 'bank_transfer', 'cheque', 'credit', 'online'];

    public function index(Request $request)
    {
        return Invoice::query()
            ->with('customer:id,name,phone')
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
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ], [
            'customer_id.required' => 'Please select a customer for this credit bill.',
            'customer_id.required_if_accepted' => 'Please select a customer for this credit bill.',
        ]);

        $invoice = DB::transaction(function () use ($data, $request) {
            foreach ($data['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                if ($product->stock_on_hand < $item['quantity']) {
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
                'created_by' => $request->user()->id,
            ] + $this->taxInvoiceFields($data, (float) Setting::get('tax_rate', 0), $total));

            $this->rememberCustomerTaxDetails($customerId, $data);

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
                    'method' => 'cash',
                    'paid_at' => now(),
                    'received_by' => $request->user()->id,
                ]);
            }

            if ($invoice->customer_id) {
                $invoice->customer()->increment('current_due', $dueAmount);
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
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ], [
            'customer_id.required' => 'Please select a customer for this credit bill.',
            'customer_id.required_if_accepted' => 'Please select a customer for this credit bill.',
        ]);

        $updatedInvoice = DB::transaction(function () use ($data, $invoice, $request) {
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
     * Download the bill as PDF: the normal bill, or (?type=vat) the tax invoice.
     */
    public function pdf(Request $request, Invoice $invoice)
    {
        $invoice->load(['items.product.brand', 'items.product.vehicleBrand', 'items.product.vehicleModel', 'customer', 'creator:id,name']);

        $isVat = $request->query('type') === 'vat';
        $logoPath = resource_path('images/logo.png');

        $pdf = Pdf::loadView($isVat ? 'invoices.vat' : 'invoices.pdf', [
            'invoice' => $invoice,
            'company' => $this->companyDetails(),
            'vat' => $this->vatBreakdown($invoice),
            'paymentMode' => $invoice->payment_mode ? ucwords(str_replace('_', ' ', $invoice->payment_mode)) : null,
            'logoDataUri' => file_exists($logoPath)
                ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
                : null,
        ]);

        return $pdf->download($isVat ? "{$invoice->invoice_no}-tax-invoice.pdf" : "{$invoice->invoice_no}.pdf");
    }

    /** Our business details for printed bills (Settings → Business details). */
    private function companyDetails(): array
    {
        return [
            'name' => Setting::get('company_name', 'Janatha Motors'),
            'tagline' => Setting::get('company_tagline'),
            'legal_name' => Setting::get('company_legal_name') ?: Setting::get('company_name', 'Janatha Motors'),
            'address' => Setting::get('company_address'),
            'phone' => Setting::get('company_phone'),
            'whatsapp' => Setting::get('company_whatsapp'),
            'email' => Setting::get('company_email'),
            'website' => Setting::get('company_website'),
            'branches' => Setting::get('company_branches'),
            'vat_reg_no' => Setting::get('vat_reg_no'),
            'business_reg_no' => Setting::get('business_reg_no'),
            'footer_note' => Setting::get('invoice_footer_note'),
        ];
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
