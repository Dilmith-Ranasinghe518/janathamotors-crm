<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Setting;
use App\Models\StockLedger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        return Invoice::query()
            ->with('customer:id,name,phone')
            ->when($request->integer('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
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

            $subtotal = collect($data['items'])->sum(
                fn ($item) => ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0)
            );
            $discount = $data['discount'] ?? 0;
            $tax = $data['tax'] ?? 0;
            $total = $subtotal - $discount + $tax;
            $paidAmount = min($data['paid_amount'] ?? 0, $total);
            $dueAmount = $total - $paidAmount;

            $invoice = Invoice::create([
                'invoice_no' => $this->nextInvoiceNumber(),
                'customer_id' => $data['customer_id'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'status' => $dueAmount <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'due'),
                'created_by' => $request->user()->id,
            ]);

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

    public function show(Invoice $invoice)
    {
        return $invoice->load('items.product', 'customer', 'payments', 'creator:id,name');
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

    public function pdf(Invoice $invoice)
    {
        $invoice->load('items.product', 'customer', 'creator:id,name');

        $logoPath = resource_path('images/logo.png');

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'company' => [
                'name' => Setting::get('company_name', 'Janatha Motors'),
                'tagline' => Setting::get('company_tagline', 'We give you the best'),
            ],
            'logoDataUri' => file_exists($logoPath)
                ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
                : null,
        ]);

        return $pdf->download("{$invoice->invoice_no}.pdf");
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
