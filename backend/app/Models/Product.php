<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'part_no', 'item_code', 'name', 'category_id', 'brand_id', 'store_id', 'shelf_location', 'vehicle_brand_id', 'vehicle_model_id', 'compatible_models',
    'cost_price', 'selling_price', 'unit', 'reorder_level', 'is_active',
])]
class Product extends Model
{
    /** System Item Numbers run 1, 2, 3, … */
    public const FIRST_ITEM_NO = 1;

    /** Auto-assigned Item Codes run 4400, 4401, … (staff may also type their own). */
    public const FIRST_ITEM_CODE = 4400;

    public static function nextItemNo(): string
    {
        return static::nextNumber('item_no', static::FIRST_ITEM_NO);
    }

    public static function nextItemCode(): string
    {
        return static::nextNumber('item_code', static::FIRST_ITEM_CODE);
    }

    /** One more than the highest purely numeric value in the column, never below $first. */
    private static function nextNumber(string $column, int $first): string
    {
        $max = static::query()->whereRaw("{$column} REGEXP '^[0-9]+$'")->max(DB::raw("CAST({$column} AS UNSIGNED)"));

        return (string) max((int) $max + 1, $first);
    }

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (! $product->item_no) {
                $product->item_no = static::nextItemNo();
            }
            if (! $product->item_code) {
                $product->item_code = static::nextItemCode();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function vehicleBrand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class);
    }

    public function stockLedger(): HasMany
    {
        return $this->hasMany(StockLedger::class);
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    /**
     * Current on-hand quantity, derived from the stock ledger — never stored directly.
     */
    public function getStockOnHandAttribute(): int
    {
        return (int) $this->stockLedger()->sum('quantity');
    }
}
