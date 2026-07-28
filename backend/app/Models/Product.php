<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'sku', 'name', 'category_id', 'brand_id', 'compatible_models',
    'cost_price', 'selling_price', 'unit', 'reorder_level', 'is_active',
])]
class Product extends Model
{
    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
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
