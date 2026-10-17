<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'title', 'supplier_id', 'store_id', 'carrier', 'tracking_no', 'origin', 'status',
    'order_date', 'shipped_date', 'eta', 'arrived_date', 'packages', 'freight_cost', 'notes', 'created_by',
])]
class Shipment extends Model
{
    /** Kanban columns, in board order. */
    public const STATUSES = ['ordered', 'shipped', 'in_transit', 'customs', 'delivered'];

    protected static function booted(): void
    {
        static::created(function (Shipment $shipment) {
            $shipment->shipment_no = sprintf('SHP-%05d', $shipment->id);
            $shipment->saveQuietly();
        });

        // Stamp the milestone dates when a card first reaches that column.
        static::saving(function (Shipment $shipment) {
            if ($shipment->isDirty('status')) {
                if ($shipment->status !== 'ordered' && ! $shipment->shipped_date) {
                    $shipment->shipped_date = now()->toDateString();
                }
                if ($shipment->status === 'delivered' && ! $shipment->arrived_date) {
                    $shipment->arrived_date = now()->toDateString();
                }
            }
        });
    }

    protected function casts(): array
    {
        return [
            'order_date' => 'date:Y-m-d',
            'shipped_date' => 'date:Y-m-d',
            'eta' => 'date:Y-m-d',
            'arrived_date' => 'date:Y-m-d',
            'freight_cost' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
