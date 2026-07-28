<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'type', 'quantity', 'reference_type', 'reference_id', 'created_by', 'note'])]
class StockLedger extends Model
{
    protected $table = 'stock_ledger';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function reference(): \Illuminate\Database\Eloquent\Relations\MorphTo
    {
        return $this->morphTo();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
