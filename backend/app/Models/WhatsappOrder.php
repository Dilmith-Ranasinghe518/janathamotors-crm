<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'invoice_id', 'order_date', 'shipping_partner', 'tracking_no',
    'vehicle_type', 'vehicle_no', 'driver_name', 'driver_mobile',
    'customer_name', 'customer_phone', 'shipping_address', 'status', 'notes', 'created_by',
])]
class WhatsappOrder extends Model
{
    public const PARTNERS = ['pickme', 'uber', 'dhl', 'prompt_xp', 'pronto', 'domex'];

    /** Ride-hailing partners: tracked by vehicle + driver instead of a tracking number. */
    public const RIDE_PARTNERS = ['pickme', 'uber'];

    public const VEHICLE_TYPES = ['bike', 'three_wheeler', 'lorry'];

    public const STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

    protected static function booted(): void
    {
        static::created(function (WhatsappOrder $order) {
            $order->order_no = sprintf('WO-%05d', $order->id);
            $order->saveQuietly();
        });
    }

    protected function casts(): array
    {
        return [
            'order_date' => 'date:Y-m-d',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
