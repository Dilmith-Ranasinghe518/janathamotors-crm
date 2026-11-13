<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'action', 'description', 'model_type', 'model_id', 'changes', 'method', 'path', 'status', 'ip_address', 'user_agent'])]
class AuditLog extends Model
{
    /** Times are stored in UTC and shown in Sri Lanka time. */
    public const DISPLAY_TIMEZONE = 'Asia/Colombo';

    protected $appends = ['created_at_lk'];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
        ];
    }

    public function getCreatedAtLkAttribute(): ?string
    {
        return $this->created_at?->copy()->setTimezone(self::DISPLAY_TIMEZONE)->format('Y-m-d h:i:s A');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
