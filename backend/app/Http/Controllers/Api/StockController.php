<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockLedger;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index(Request $request)
    {
        return StockLedger::query()
            ->with(['product:id,sku,name', 'store:id,name,code,location'])
            ->when($request->integer('product_id'), fn ($q, $productId) => $q->where('product_id', $productId))
            ->when($request->integer('store_id'), fn ($q, $storeId) => $q->where('store_id', $storeId))
            ->latest()
            ->paginate(30);
    }

    public function adjust(Request $request, Product $product)
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'not_in:0'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = StockLedger::create([
            'product_id' => $product->id,
            'store_id' => $data['store_id'] ?? $product->store_id,
            'type' => 'adjustment',
            'quantity' => $data['quantity'],
            'created_by' => $request->user()->id,
            'note' => $data['note'] ?? null,
        ]);

        return response()->json([
            'entry' => $entry->load('store'),
            'stock_on_hand' => $product->stock_on_hand,
        ], 201);
    }
}
