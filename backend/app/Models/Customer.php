<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'phone', 'email', 'address', 'vehicle_no', 'opening_balance', 'current_due', 'is_active'])]
class Customer extends Model
{
    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'current_due' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
