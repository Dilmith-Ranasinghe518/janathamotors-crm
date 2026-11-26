<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'voucher_no',
        'store_id',
        'user_id',
        'amount',
        'category',
        'description',
        'receipt_url',
        'receipt_reference',
        'status',
        'expense_date',
        'approved_by',
        'approved_at',
        'approval_notes',
        'rejection_reason',
        'paid_by',
        'paid_at',
        'payment_method',
        'payment_notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public static function nextVoucherNo(): string
    {
        $last = static::orderByDesc('id')->first();
        if (! $last || ! $last->voucher_no) {
            return 'JM-PC-00001';
        }

        $num = (int) preg_replace('/\D/', '', $last->voucher_no);
        return sprintf('JM-PC-%05d', $num + 1);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
