<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        return Purchase::query()
            ->with(['supplier:id,name', 'store:id,name,code,location'])
            ->when($request->integer('supplier_id'), fn ($q, $id) => $q->where('supplier_id', $id))
            ->when($request->integer('store_id'), fn ($q, $id) => $q->where('store_id', $id))
            ->latest('purchased_at')
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'purchased_at' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        $purchase = DB::transaction(function () use ($data, $request) {
            $total = collect($data['items'])->sum(fn ($item) => $item['quantity'] * $item['unit_cost']);

            $purchase = Purchase::create([
                'reference_no' => 'PO-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'supplier_id' => $data['supplier_id'],
                'store_id' => $data['store_id'] ?? null,
                'purchased_at' => $data['purchased_at'],
                'total' => $total,
                'status' => 'received',
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_cost'];

                $purchaseItem = $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $lineTotal,
                ]);

                $product = \App\Models\Product::find($item['product_id']);

                StockLedger::create([
                    'product_id' => $item['product_id'],
                    'store_id' => $data['store_id'] ?? $product?->store_id,
                    'type' => 'purchase',
                    'quantity' => $item['quantity'],
                    'reference_type' => Purchase::class,
                    'reference_id' => $purchase->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            return $purchase;
        });

        return response()->json($purchase->load('items.product', 'supplier', 'store'), 201);
    }

    public function show(Purchase $purchase)
    {
        return $purchase->load('items.product', 'supplier', 'creator:id,name');
    }
}
