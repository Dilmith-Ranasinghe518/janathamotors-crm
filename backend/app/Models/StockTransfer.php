<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['transfer_no', 'po_no', 'from_store_id', 'to_store_id', 'transferred_at', 'status', 'notes', 'created_by'])]
class StockTransfer extends Model
{
    protected function casts(): array
    {
        return [
            'transferred_at' => 'date',
        ];
    }

    /** Next PO number for the year, e.g. JMPO/2026/00007. Call inside the saving transaction. */
    public static function nextPoNumber(?\DateTimeInterface $date = null): string
    {
        $year = ($date ?? now())->format('Y');
        $prefix = "JMPO/{$year}/";
        $last = static::where('po_no', 'like', $prefix.'%')->lockForUpdate()->orderByDesc('po_no')->value('po_no');
        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    public function fromStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'from_store_id');
    }

    public function toStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'to_store_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
