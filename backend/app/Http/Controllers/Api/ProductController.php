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
            ->with(['category', 'brand', 'store', 'vehicleBrand', 'vehicleModel'])
            ->withSum('stockLedger as stock_on_hand', 'quantity')
            ->when($request->filled('store_id'), fn ($q) => $q->where('store_id', $request->input('store_id')))
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($q) => $q->where('name', 'like', $term)
                    ->orWhere('sku', 'like', $term)
                    ->orWhere('compatible_models', 'like', $term)
                    ->orWhereHas('brand', fn ($bq) => $bq->where('name', 'like', $term))
                    ->orWhereHas('vehicleBrand', fn ($vbq) => $vbq->where('name', 'like', $term))
                    ->orWhereHas('vehicleModel', fn ($vmq) => $vmq->where('name', 'like', $term))
                    ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', $term)->orWhere('code', 'like', $term)->orWhere('location', 'like', $term))
                );
            })
            ->when($request->boolean('low_stock'), fn ($q) => $q->whereRaw(
                '(select coalesce(sum(quantity), 0) from stock_ledger where stock_ledger.product_id = products.id) <= products.reorder_level'
            ))
            ->orderBy('name')
            ->paginate(100);

        return $products;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'vehicle_brand_id' => ['nullable', 'exists:vehicle_brands,id'],
            'vehicle_model_id' => ['nullable', 'exists:vehicle_models,id'],
            'compatible_models' => ['nullable', 'string'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:20'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
        ]);

        if (empty($data['store_id'])) {
            $defaultStore = \App\Models\Store::where('code', 'JMS-01')->first() ?? \App\Models\Store::first();
            if ($defaultStore) {
                $data['store_id'] = $defaultStore->id;
            }
        }

        return response()->json(Product::create($data)->load(['category', 'brand', 'store', 'vehicleBrand', 'vehicleModel']), 201);
    }

    public function show(Product $product)
    {
        return $product->load(['category', 'brand', 'store', 'vehicleBrand', 'vehicleModel'])->append('stock_on_hand');
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku,'.$product->id],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'vehicle_brand_id' => ['nullable', 'exists:vehicle_brands,id'],
            'vehicle_model_id' => ['nullable', 'exists:vehicle_models,id'],
            'compatible_models' => ['nullable', 'string'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:20'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $product->update($data);

        return $product->load(['category', 'brand', 'store', 'vehicleBrand', 'vehicleModel']);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(null, 204);
    }
}
