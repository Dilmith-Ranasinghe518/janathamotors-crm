<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with(['category', 'brand'])
            ->withSum('stockLedger as stock_on_hand', 'quantity')
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('sku', 'like', $term));
            })
            ->when($request->boolean('low_stock'), fn ($q) => $q->whereRaw(
                '(select coalesce(sum(quantity), 0) from stock_ledger where stock_ledger.product_id = products.id) <= products.reorder_level'
            ))
            ->orderBy('name')
            ->paginate(20);

        return $products;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'compatible_models' => ['nullable', 'string'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:20'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
        ]);

        return response()->json(Product::create($data), 201);
    }

    public function show(Product $product)
    {
        return $product->load(['category', 'brand'])->append('stock_on_hand');
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku,'.$product->id],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'compatible_models' => ['nullable', 'string'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:20'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $product->update($data);

        return $product;
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(null, 204);
    }
}
