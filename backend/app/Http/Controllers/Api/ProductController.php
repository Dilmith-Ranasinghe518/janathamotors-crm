<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockLedger;
use App\Models\Store;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with(['category', 'brand', 'store', 'vehicleBrand', 'vehicleModel'])
            ->withSum('stockLedger as stock_on_hand', 'quantity')
            ->when($request->filled('store_id'), fn ($q) => $q->where('store_id', $request->input('store_id')))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->input('category_id')))
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($q) => $q->where('name', 'like', $term)
                    ->orWhere('sku', 'like', $term)
                    ->orWhere('compatible_models', 'like', $term)
                    ->orWhereHas('category', fn ($cq) => $cq->where('name', 'like', $term))
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
            $defaultStore = Store::where('code', 'JMS-01')->first() ?? Store::first();
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

    /**
     * Export inventory products to a downloadable CSV file.
     */
    public function export(Request $request): StreamedResponse
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
            ->get();

        $filename = 'inventory_export_'.now()->format('Y-m-d_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($products) {
            $file = fopen('php://output', 'w');
            // Write BOM for full UTF-8 / Excel compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'SKU',
                'Name',
                'Brand',
                'Category',
                'Store Code',
                'Vehicle Brand',
                'Vehicle Model',
                'Compatible Models',
                'Cost Price',
                'Selling Price',
                'Current Stock',
                'Reorder Level',
                'Unit',
            ]);

            foreach ($products as $p) {
                fputcsv($file, [
                    $p->sku,
                    $p->name,
                    $p->brand?->name ?? '',
                    $p->category?->name ?? '',
                    $p->store?->code ?? $p->store?->name ?? '',
                    $p->vehicleBrand?->name ?? '',
                    $p->vehicleModel?->name ?? '',
                    $p->compatible_models ?? '',
                    $p->cost_price,
                    $p->selling_price,
                    (int) ($p->stock_on_hand ?? 0),
                    $p->reorder_level,
                    $p->unit ?? 'pc',
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Download a clean CSV template for bulk importing products.
     */
    public function template(): StreamedResponse
    {
        $filename = 'inventory_template.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'SKU',
                'Name',
                'Brand',
                'Category',
                'Store Code',
                'Vehicle Brand',
                'Vehicle Model',
                'Compatible Models',
                'Cost Price',
                'Selling Price',
                'Current Stock',
                'Reorder Level',
                'Unit',
            ]);

            fputcsv($file, [
                'AF-PER-AXIA',
                'Air Filter - Perodua Axia 1.0',
                'Denso',
                'Filters',
                'JMS-01',
                'Perodua',
                'Axia',
                'Axia 1.0 (1KR-VE)',
                '1400.00',
                '2100.00',
                '20',
                '5',
                'pc',
            ]);

            fputcsv($file, [
                'BP-BOSCH-BEZ',
                'Front Brake Pads - Perodua Bezza',
                'Bosch',
                'Brakes',
                'JMS-01',
                'Perodua',
                'Bezza',
                'Bezza 1.0 / 1.3 (2016-on)',
                '3200.00',
                '4900.00',
                '15',
                '5',
                'set',
            ]);

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Bulk import inventory products from a CSV file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'update_existing' => ['nullable'],
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $handle = fopen($path, 'r');

        if (! $handle) {
            return response()->json(['message' => 'Unable to read the uploaded CSV file.'], 422);
        }

        // Read and parse header
        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            return response()->json(['message' => 'The uploaded CSV file is empty.'], 422);
        }

        // Strip UTF-8 BOM if present on the first header cell
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);

        $columnMap = [];
        foreach ($header as $index => $col) {
            $clean = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $col)));
            $clean = trim($clean, '_');

            if (in_array($clean, ['sku', 'part_no', 'part_number', 'item_code', 'code'])) {
                $columnMap['sku'] = $index;
            } elseif (in_array($clean, ['name', 'product_name', 'item_name', 'title'])) {
                $columnMap['name'] = $index;
            } elseif (in_array($clean, ['brand', 'brand_name'])) {
                $columnMap['brand'] = $index;
            } elseif (in_array($clean, ['category', 'category_name'])) {
                $columnMap['category'] = $index;
            } elseif (in_array($clean, ['store', 'store_code', 'store_location', 'outlet', 'location'])) {
                $columnMap['store'] = $index;
            } elseif (in_array($clean, ['vehicle_brand', 'car_brand', 'vehicle_make', 'make'])) {
                $columnMap['vehicle_brand'] = $index;
            } elseif (in_array($clean, ['vehicle_model', 'car_model', 'model'])) {
                $columnMap['vehicle_model'] = $index;
            } elseif (in_array($clean, ['compatible_models', 'compatibility', 'compatible', 'compatible_vehicles'])) {
                $columnMap['compatible_models'] = $index;
            } elseif (in_array($clean, ['cost_price', 'cost', 'buying_price', 'purchase_price'])) {
                $columnMap['cost_price'] = $index;
            } elseif (in_array($clean, ['selling_price', 'price', 'sale_price', 'retail_price', 'unit_price'])) {
                $columnMap['selling_price'] = $index;
            } elseif (in_array($clean, ['stock', 'current_stock', 'stock_on_hand', 'quantity', 'qty'])) {
                $columnMap['stock'] = $index;
            } elseif (in_array($clean, ['reorder_level', 'reorder', 'min_stock', 'alert_quantity', 'low_stock_threshold'])) {
                $columnMap['reorder_level'] = $index;
            } elseif (in_array($clean, ['unit', 'uom'])) {
                $columnMap['unit'] = $index;
            }
        }

        if (! isset($columnMap['sku']) || ! isset($columnMap['name'])) {
            fclose($handle);
            return response()->json([
                'message' => "Invalid CSV format: The file must contain at least 'SKU' and 'Name' columns.",
            ], 422);
        }

        $updateExisting = filter_var($request->input('update_existing', true), FILTER_VALIDATE_BOOLEAN);

        // Preload master lookup caches for performance
        $categories = Category::all()->keyBy(fn ($c) => strtolower(trim($c->name)));
        $brands = Brand::all()->keyBy(fn ($b) => strtolower(trim($b->name)));
        $storesByCode = Store::all()->keyBy(fn ($s) => strtoupper(trim((string) $s->code)));
        $storesByName = Store::all()->keyBy(fn ($s) => strtolower(trim($s->name)));
        $vehicleBrands = VehicleBrand::all()->keyBy(fn ($vb) => strtolower(trim($vb->name)));
        $vehicleModels = VehicleModel::all()->keyBy(fn ($vm) => strtolower(trim($vm->name)).'_'.$vm->vehicle_brand_id);
        $defaultStore = Store::where('code', 'JMS-01')->first() ?? Store::first();

        $rowNumber = 1;
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            // Skip completely empty lines
            if (empty(array_filter($row, fn ($val) => trim((string) $val) !== ''))) {
                continue;
            }

            $sku = isset($columnMap['sku']) && isset($row[$columnMap['sku']]) ? trim((string) $row[$columnMap['sku']]) : '';
            $name = isset($columnMap['name']) && isset($row[$columnMap['name']]) ? trim((string) $row[$columnMap['name']]) : '';

            if (empty($sku)) {
                $errors[] = "Row {$rowNumber}: Missing SKU. Row skipped.";
                $skipped++;
                continue;
            }

            if (empty($name)) {
                $errors[] = "Row {$rowNumber} (SKU {$sku}): Missing product name. Row skipped.";
                $skipped++;
                continue;
            }

            // Resolve or create Category
            $categoryId = null;
            if (isset($columnMap['category']) && ! empty(trim((string) ($row[$columnMap['category']] ?? '')))) {
                $cName = trim((string) $row[$columnMap['category']]);
                $cKey = strtolower($cName);
                if (! isset($categories[$cKey])) {
                    $newCat = Category::create(['name' => $cName]);
                    $categories[$cKey] = $newCat;
                }
                $categoryId = $categories[$cKey]->id;
            }

            // Resolve or create Brand
            $brandId = null;
            if (isset($columnMap['brand']) && ! empty(trim((string) ($row[$columnMap['brand']] ?? '')))) {
                $bName = trim((string) $row[$columnMap['brand']]);
                $bKey = strtolower($bName);
                if (! isset($brands[$bKey])) {
                    $newBrand = Brand::create(['name' => $bName]);
                    $brands[$bKey] = $newBrand;
                }
                $brandId = $brands[$bKey]->id;
            }

            // Resolve Store
            $storeId = $defaultStore?->id;
            if (isset($columnMap['store']) && ! empty(trim((string) ($row[$columnMap['store']] ?? '')))) {
                $stVal = trim((string) $row[$columnMap['store']]);
                $stCodeKey = strtoupper($stVal);
                $stNameKey = strtolower($stVal);
                if (isset($storesByCode[$stCodeKey])) {
                    $storeId = $storesByCode[$stCodeKey]->id;
                } elseif (isset($storesByName[$stNameKey])) {
                    $storeId = $storesByName[$stNameKey]->id;
                }
            }

            // Resolve or create Vehicle Brand
            $vehicleBrandId = null;
            if (isset($columnMap['vehicle_brand']) && ! empty(trim((string) ($row[$columnMap['vehicle_brand']] ?? '')))) {
                $vbName = trim((string) $row[$columnMap['vehicle_brand']]);
                $vbKey = strtolower($vbName);
                if (! isset($vehicleBrands[$vbKey])) {
                    $newVb = VehicleBrand::create(['name' => $vbName]);
                    $vehicleBrands[$vbKey] = $newVb;
                }
                $vehicleBrandId = $vehicleBrands[$vbKey]->id;
            }

            // Resolve or create Vehicle Model
            $vehicleModelId = null;
            if ($vehicleBrandId && isset($columnMap['vehicle_model']) && ! empty(trim((string) ($row[$columnMap['vehicle_model']] ?? '')))) {
                $vmName = trim((string) $row[$columnMap['vehicle_model']]);
                $vmKey = strtolower($vmName).'_'.$vehicleBrandId;
                if (! isset($vehicleModels[$vmKey])) {
                    $newVm = VehicleModel::create(['name' => $vmName, 'vehicle_brand_id' => $vehicleBrandId]);
                    $vehicleModels[$vmKey] = $newVm;
                }
                $vehicleModelId = $vehicleModels[$vmKey]->id;
            }

            $costPrice = isset($columnMap['cost_price']) && is_numeric(trim((string) ($row[$columnMap['cost_price']] ?? '')))
                ? (float) trim((string) $row[$columnMap['cost_price']])
                : 0.0;

            $sellingPrice = isset($columnMap['selling_price']) && is_numeric(trim((string) ($row[$columnMap['selling_price']] ?? '')))
                ? (float) trim((string) $row[$columnMap['selling_price']])
                : 0.0;

            $reorderLevel = isset($columnMap['reorder_level']) && is_numeric(trim((string) ($row[$columnMap['reorder_level']] ?? '')))
                ? (int) trim((string) $row[$columnMap['reorder_level']])
                : 5;

            $unit = isset($columnMap['unit']) && ! empty(trim((string) ($row[$columnMap['unit']] ?? '')))
                ? trim((string) $row[$columnMap['unit']])
                : 'pc';

            $compatible = isset($columnMap['compatible_models'])
                ? trim((string) ($row[$columnMap['compatible_models']] ?? ''))
                : null;

            $stockSpecified = isset($columnMap['stock']) && is_numeric(trim((string) ($row[$columnMap['stock']] ?? '')));
            $targetStock = $stockSpecified ? (int) trim((string) $row[$columnMap['stock']]) : 0;

            $product = Product::where('sku', $sku)->first();

            if ($product) {
                if (! $updateExisting) {
                    $skipped++;
                    continue;
                }

                $product->update([
                    'name' => $name,
                    'category_id' => $categoryId ?? $product->category_id,
                    'brand_id' => $brandId ?? $product->brand_id,
                    'store_id' => $storeId ?? $product->store_id,
                    'vehicle_brand_id' => $vehicleBrandId ?? $product->vehicle_brand_id,
                    'vehicle_model_id' => $vehicleModelId ?? $product->vehicle_model_id,
                    'compatible_models' => $compatible ?? $product->compatible_models,
                    'cost_price' => $costPrice ?: $product->cost_price,
                    'selling_price' => $sellingPrice ?: $product->selling_price,
                    'reorder_level' => $reorderLevel,
                    'unit' => $unit,
                ]);

                if ($stockSpecified) {
                    $currentStock = $product->stock_on_hand;
                    $diff = $targetStock - $currentStock;
                    if ($diff !== 0) {
                        StockLedger::create([
                            'product_id' => $product->id,
                            'store_id' => $product->store_id,
                            'type' => 'adjustment',
                            'quantity' => $diff,
                            'created_by' => $request->user()->id,
                            'note' => 'Stock adjustment via CSV import',
                        ]);
                    }
                }

                $updated++;
            } else {
                $newProduct = Product::create([
                    'sku' => $sku,
                    'name' => $name,
                    'category_id' => $categoryId,
                    'brand_id' => $brandId,
                    'store_id' => $storeId,
                    'vehicle_brand_id' => $vehicleBrandId,
                    'vehicle_model_id' => $vehicleModelId,
                    'compatible_models' => $compatible,
                    'cost_price' => $costPrice,
                    'selling_price' => $sellingPrice,
                    'reorder_level' => $reorderLevel,
                    'unit' => $unit,
                ]);

                if ($stockSpecified && $targetStock > 0) {
                    StockLedger::create([
                        'product_id' => $newProduct->id,
                        'store_id' => $newProduct->store_id,
                        'type' => 'adjustment',
                        'quantity' => $targetStock,
                        'created_by' => $request->user()->id,
                        'note' => 'Initial stock via CSV import',
                    ]);
                }

                $created++;
            }
        }

        fclose($handle);

        return response()->json([
            'message' => "Import completed: {$created} created, {$updated} updated.",
            'total_processed' => $created + $updated + $skipped,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }
}
