<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ActivityLogController extends Controller
{
    /**
     * Admin only. Newest first; date filters are Sri Lanka calendar days.
     */
    public function index(Request $request)
    {
        $tz = AuditLog::DISPLAY_TIMEZONE;

        return AuditLog::query()
            ->with('user:id,name,email')
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->input('user_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('action', 'like', $request->input('category').'.%'))
            ->when($request->filled('from'), fn ($q) => $q->where('created_at', '>=', Carbon::parse($request->input('from'), $tz)->startOfDay()->utc()))
            ->when($request->filled('to'), fn ($q) => $q->where('created_at', '<=', Carbon::parse($request->input('to'), $tz)->endOfDay()->utc()))
            ->when($request->string('search')->trim()->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search')->trim().'%';
                $q->where(fn ($q) => $q->where('description', 'like', $term)
                    ->orWhere('ip_address', 'like', $term)
                    ->orWhere('action', 'like', $term)
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', $term)));
            })
            ->latest('id')
            ->paginate(min(max($request->integer('per_page', 50), 1), 200));
    }
}
