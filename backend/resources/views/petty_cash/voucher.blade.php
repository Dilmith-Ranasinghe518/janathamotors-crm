<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 16px 24px; size: a5 landscape; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1f2937; line-height: 1.35; margin: 0; padding: 0; }
    table { border-collapse: collapse; }

    .head { width: 100%; margin: 0; }
    .head-rule { border-top: 2px solid #1f2a5a; margin: 5px 0 8px; }
    .logo-cell { width: 70px; vertical-align: middle; padding: 0 10px 0 0; }
    .logo { max-height: 55px; max-width: 70px; display: block; }
    .name-cell { vertical-align: middle; padding: 0; }
    .co-name { font-size: 26px; font-weight: bold; color: #1f2a5a; margin: 0; line-height: 1; letter-spacing: -0.2px; }
    .co-line { font-size: 9.5px; color: #4b5563; margin-top: 2px; }

    .title-bar { width: 100%; margin: 4px 0 10px; }
    .title { font-size: 16px; font-weight: bold; letter-spacing: 1px; color: #111827; }
    .status-badge { text-align: right; }
    .status-pill { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
    .status-approved { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .status-paid { background: #dcfce7; color: #166534; border: 1px solid #22c55e; }
    .status-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; }

    .grid { width: 100%; margin-bottom: 8px; }
    .grid td { vertical-align: top; padding: 0; }
    .gap { width: 2%; }

    .box { width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
    .box td { padding: 4px 8px; vertical-align: top; font-size: 9.5px; }
    .lbl { font-weight: bold; color: #374151; width: 34%; background: #f1f5f9; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .val { color: #111827; border-bottom: 1px solid #e2e8f0; }
    .box tr:last-child .lbl, .box tr:last-child .val { border-bottom: none; }

    .details-table { width: 100%; border: 1px solid #1f2a5a; margin-top: 6px; }
    .details-table th { background: #1f2a5a; color: #fff; font-size: 9.5px; font-weight: bold; text-transform: uppercase; padding: 6px 8px; text-align: left; }
    .details-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    .amount-cell { background: #f8fafc; text-align: right; font-size: 15px; font-weight: bold; color: #047857; font-family: 'Courier', monospace; }

    .sign { width: 100%; margin-top: 28px; }
    .sign td { width: 25%; font-size: 8.5px; color: #374151; padding: 0 8px; text-align: center; }
    .sign .line { border-top: 1px dashed #64748b; padding-top: 4px; font-weight: bold; }
    .sign .role { font-size: 7.5px; color: #64748b; margin-top: 1px; }

    .credit { margin-top: 18px; text-align: center; font-size: 7.5px; color: #9ca3af; }
</style>
</head>
<body>
    <table class="head">
        <tr>
            @if($logo)
                <td class="logo-cell"><img src="{{ $logo }}" class="logo" alt="{{ $company['name'] }}"></td>
            @endif
            <td class="name-cell">
                <div class="co-name">{{ strtoupper($company['legal_name'] ?? $company['name']) }}</div>
                <div class="co-line">{{ $company['address'] }} &nbsp;|&nbsp; Tel: {{ $company['phone'] }} @if(!empty($company['email']))&nbsp;|&nbsp; {{ $company['email'] }}@endif</div>
            </td>
        </tr>
    </table>

    <div class="head-rule"></div>

    <table class="title-bar">
        <tr>
            <td class="title">PETTY CASH VOUCHER</td>
            <td class="status-badge">
                <span class="status-pill status-{{ $voucher->status }}">{{ $voucher->status }}</span>
            </td>
        </tr>
    </table>

    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">Voucher No</td><td class="val"><b>{{ $voucher->voucher_no }}</b></td></tr>
                    <tr><td class="lbl">Expense Date</td><td class="val">{{ $voucher->expense_date?->format('Y-m-d') }}</td></tr>
                    <tr><td class="lbl">Requested By</td><td class="val"><b>{{ $voucher->user?->name ?? 'Staff' }}</b></td></tr>
                    <tr><td class="lbl">Outlet / Store</td><td class="val">{{ $voucher->store?->name ?? 'Main Outlet' }}</td></tr>
                </table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">Category</td><td class="val"><b>{{ $voucher->category }}</b></td></tr>
                    <tr><td class="lbl">Bill / Ref No</td><td class="val">{{ $voucher->receipt_reference ?: '—' }}</td></tr>
                    <tr><td class="lbl">Approved By</td><td class="val">{{ $voucher->approver?->name ? $voucher->approver->name . ' (' . $voucher->approved_at?->format('Y-m-d') . ')' : 'Pending Approval' }}</td></tr>
                    <tr><td class="lbl">Payment Info</td><td class="val">{{ $voucher->status === 'paid' ? ($voucher->payment_method ?: 'Cash') . ' by ' . ($voucher->payer?->name ?? 'Finance') : 'Unpaid' }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="details-table">
        <thead>
            <tr>
                <th style="width: 70%;">Particulars / Purpose of Expenditure</th>
                <th style="width: 30%; text-align: right;">Amount (LKR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <div style="font-size: 11px; font-weight: bold; color: #111827; margin-bottom: 4px;">{{ $voucher->category }}</div>
                    <div style="color: #374151;">{!! nl2br(e($voucher->description)) !!}</div>
                    @if($voucher->approval_notes)
                        <div style="margin-top: 6px; font-size: 8.5px; color: #1e40af;"><b>Approval Note:</b> {{ $voucher->approval_notes }}</div>
                    @endif
                    @if($voucher->rejection_reason)
                        <div style="margin-top: 6px; font-size: 8.5px; color: #991b1b;"><b>Rejection Reason:</b> {{ $voucher->rejection_reason }}</div>
                    @endif
                    @if($voucher->payment_notes)
                        <div style="margin-top: 6px; font-size: 8.5px; color: #166534;"><b>Disbursement Note:</b> {{ $voucher->payment_notes }}</div>
                    @endif
                </td>
                <td class="amount-cell">
                    {{ number_format($voucher->amount, 2) }}
                </td>
            </tr>
        </tbody>
    </table>

    <table class="sign">
        <tr>
            <td>
                <div class="line">{{ $voucher->user?->name ?? 'Staff' }}</div>
                <div class="role">Prepared By (Requester)</div>
            </td>
            <td>
                <div class="line">{{ $voucher->approver?->name ?? '..................................' }}</div>
                <div class="role">Approved By (Finance Admin)</div>
            </td>
            <td>
                <div class="line">{{ $voucher->payer?->name ?? '..................................' }}</div>
                <div class="role">Disbursed / Paid By</div>
            </td>
            <td>
                <div class="line">..................................</div>
                <div class="role">Cash Received By</div>
            </td>
        </tr>
    </table>

    <div class="credit">Software by Calcify Int &nbsp;·&nbsp; Janatha Motors Management System</div>
</body>
</html>
