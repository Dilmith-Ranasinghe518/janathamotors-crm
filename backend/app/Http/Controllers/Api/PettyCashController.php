<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PettyCashRequest;
use App\Models\PettyCashTopUp;
use App\Support\PrintsCompanyHeader;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PettyCashController extends Controller
{
    use PrintsCompanyHeader;

    /**
     * List petty cash requests with filtering.
     */
    public function index(Request $request)
    {
        $query = PettyCashRequest::with([
            'user:id,name,email',
            'store:id,name,code',
            'approver:id,name',
            'payer:id,name',
        ]);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('store_id') && $request->store_id !== 'all') {
            $query->where('store_id', $request->store_id);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('expense_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('expense_date', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('voucher_no', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('receipt_reference', 'like', "%{$term}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$term}%"));
            });
        }

        // If requested to view only current user's requests
        if ($request->boolean('my_requests')) {
            $query->where('user_id', $request->user()->id);
        }

        $requests = $query->orderByDesc('id')->paginate($request->integer('per_page', 25));

        return response()->json($requests);
    }

    /**
     * Financial summary of the petty cash float and requests.
     */
    public function summary(Request $request)
    {
        $totalTopUps = (float) PettyCashTopUp::sum('amount');
        $totalPaid = (float) PettyCashRequest::where('status', 'paid')->sum('amount');
        $currentBalance = max(0, $totalTopUps - $totalPaid);

        $now = now();
        $spentThisMonth = (float) PettyCashRequest::where('status', 'paid')
            ->whereYear('paid_at', $now->year)
            ->whereMonth('paid_at', $now->month)
            ->sum('amount');

        $pendingCount = PettyCashRequest::where('status', 'pending')->count();
        $pendingAmount = (float) PettyCashRequest::where('status', 'pending')->sum('amount');

        $approvedCount = PettyCashRequest::where('status', 'approved')->count();
        $approvedAmount = (float) PettyCashRequest::where('status', 'approved')->sum('amount');

        $categories = PettyCashRequest::where('status', 'paid')
            ->select('category', DB::raw('SUM(amount) as total_amount'), DB::raw('COUNT(*) as total_count'))
            ->groupBy('category')
            ->orderByDesc('total_amount')
            ->get();

        return response()->json([
            'current_balance' => round($currentBalance, 2),
            'total_top_ups' => round($totalTopUps, 2),
            'total_disbursed' => round($totalPaid, 2),
            'spent_this_month' => round($spentThisMonth, 2),
            'pending_count' => $pendingCount,
            'pending_amount' => round($pendingAmount, 2),
            'approved_count' => $approvedCount,
            'approved_amount' => round($approvedAmount, 2),
            'categories' => $categories,
        ]);
    }

    /**
     * Submit a new petty cash request by Staff.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:500000'],
            'category' => ['required', 'string', 'max:64'],
            'description' => ['required', 'string', 'max:1000'],
            'expense_date' => ['required', 'date'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'receipt_reference' => ['nullable', 'string', 'max:100'],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $receiptUrl = null;
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('petty_cash_receipts', 'public');
            $receiptUrl = Storage::disk('public')->url($path);
        }

        $voucher = PettyCashRequest::create([
            'voucher_no' => PettyCashRequest::nextVoucherNo(),
            'store_id' => $data['store_id'] ?? null,
            'user_id' => $request->user()->id,
            'amount' => $data['amount'],
            'category' => $data['category'],
            'description' => $data['description'],
            'expense_date' => $data['expense_date'],
            'receipt_url' => $receiptUrl,
            'receipt_reference' => $data['receipt_reference'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json($voucher->load(['user:id,name', 'store:id,name']), 201);
    }

    /**
     * Show single petty cash request.
     */
    public function show(PettyCashRequest $pettyCashRequest)
    {
        return response()->json($pettyCashRequest->load([
            'user:id,name,email',
            'store:id,name',
            'approver:id,name',
            'payer:id,name',
        ]));
    }

    /**
     * Finance Admin / Admin approves a pending request.
     */
    public function approve(Request $request, PettyCashRequest $pettyCashRequest)
    {
        if ($pettyCashRequest->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be approved.'], 422);
        }

        $data = $request->validate([
            'approval_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $pettyCashRequest->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'approval_notes' => $data['approval_notes'] ?? null,
            'rejection_reason' => null,
        ]);

        return response()->json($pettyCashRequest->load(['user:id,name', 'approver:id,name', 'store:id,name']));
    }

    /**
     * Finance Admin / Admin rejects a pending request.
     */
    public function reject(Request $request, PettyCashRequest $pettyCashRequest)
    {
        if ($pettyCashRequest->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be rejected.'], 422);
        }

        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $pettyCashRequest->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => $data['rejection_reason'],
        ]);

        return response()->json($pettyCashRequest->load(['user:id,name', 'approver:id,name', 'store:id,name']));
    }

    /**
     * Disburse cash (payout) for an approved request.
     */
    public function disburse(Request $request, PettyCashRequest $pettyCashRequest)
    {
        if ($pettyCashRequest->status !== 'approved') {
            return response()->json(['message' => 'Only approved requests can be disbursed.'], 422);
        }

        $data = $request->validate([
            'payment_method' => ['nullable', 'string', 'max:64'],
            'payment_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $pettyCashRequest->update([
            'status' => 'paid',
            'paid_by' => $request->user()->id,
            'paid_at' => now(),
            'payment_method' => $data['payment_method'] ?? 'Cash',
            'payment_notes' => $data['payment_notes'] ?? null,
        ]);

        return response()->json($pettyCashRequest->load([
            'user:id,name',
            'approver:id,name',
            'payer:id,name',
            'store:id,name',
        ]));
    }

    /**
     * Top-up the petty cash float / box balance.
     */
    public function topUp(Request $request)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:2000000'],
            'source' => ['required', 'string', 'max:100'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'store_id' => ['nullable', 'exists:stores,id'],
        ]);

        $topUp = PettyCashTopUp::create([
            'store_id' => $data['store_id'] ?? null,
            'amount' => $data['amount'],
            'source' => $data['source'],
            'reference_no' => $data['reference_no'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($topUp->load(['creator:id,name', 'store:id,name']), 201);
    }

    /**
     * List recent top-ups.
     */
    public function topUps(Request $request)
    {
        $topUps = PettyCashTopUp::with(['creator:id,name', 'store:id,name'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json($topUps);
    }

    /**
     * Delete a petty cash request.
     */
    public function destroy(Request $request, PettyCashRequest $pettyCashRequest)
    {
        $user = $request->user();
        $isOwner = $pettyCashRequest->user_id === $user->id;
        $isPrivileged = $user->hasRole('Admin') || $user->hasRole('Finance Admin');

        if (! $isPrivileged && ! ($isOwner && $pettyCashRequest->status === 'pending')) {
            return response()->json(['message' => 'You cannot delete this petty cash voucher.'], 403);
        }

        if ($pettyCashRequest->receipt_url) {
            $relativePath = str_replace('/storage/', '', parse_url($pettyCashRequest->receipt_url, PHP_URL_PATH) ?? '');
            if ($relativePath && Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }
        }

        $pettyCashRequest->delete();

        return response()->json(null, 204);
    }

    /**
     * Generate printable Petty Cash Voucher PDF.
     */
    public function voucherPdf(PettyCashRequest $pettyCashRequest)
    {
        $pettyCashRequest->load(['user', 'store', 'approver', 'payer']);

        $pdf = Pdf::loadView('petty_cash.voucher', [
            'voucher' => $pettyCashRequest,
            'company' => $this->companyDetails(),
            'logo' => $this->logoDataUri(),
            'icons' => $this->billIcons(),
        ])->setPaper('a5', 'landscape');

        return $pdf->stream("Voucher-{$pettyCashRequest->voucher_no}.pdf");
    }
}
