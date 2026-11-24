{{-- Stock transfer PO: same business header as the bills. --}}
@php
    $fromStore = $transfer->fromStore;
    $toStore = $transfer->toStore;
    $totalQty = $transfer->items->sum('quantity');
    $storeLines = fn ($s) => array_filter([$s?->name, $s?->address ?: $s?->location, $s?->phone ? 'Tel: '.$s->phone : null]);
@endphp
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 12px 26px 22px; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1f2937; line-height: 1.35; }
    table { border-collapse: collapse; }

    .head { width: 100%; margin: 0; }
    .head-rule { border-top: 1.5px solid #1f2a5a; margin: 5px 0 2px; }
    .logo-cell { width: 82px; vertical-align: middle; padding: 0 8px 0 0; }
    .logo { max-height: 70px; max-width: 80px; display: block; }
    .name-cell { vertical-align: middle; padding: 0; }
    .co-name { font-size: 41px; font-weight: bold; color: #1f2a5a; margin: 0; line-height: 1; letter-spacing: -0.2px; white-space: nowrap; }
    .info-cell { text-align: center; padding: 0; }
    .co-line { font-size: 11px; line-height: 1.25; color: #1f2937; margin-top: 1px; font-weight: bold; }
    .info-line { margin: 1px auto 0; }
    .info-line td { vertical-align: middle; padding: 0; font-size: 11px; line-height: 1.25; font-weight: bold; color: #1f2937; white-space: nowrap; }
    .info-line .i { width: 13px; padding-right: 4px; }
    .info-line .i img { width: 11px; height: 11px; display: block; }
    .info-line .sp { width: 14px; }
    .co-tag { font-size: 12.5px; line-height: 1.2; font-weight: bold; color: #c2410c; margin-top: 2px; }

    .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #111827; margin: 4px 0 6px; }
    .status { text-align: center; margin: -4px 0 8px; font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .status span { padding: 2px 8px; border-radius: 8px; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-partial { background: #fef3c7; color: #b45309; }
    .status-due { background: #fee2e2; color: #b91c1c; }
    .status-cancelled { background: #f1f5f9; color: #64748b; }

    .box { width: 100%; border: 1px solid #6b7280; border-radius: 6px; }
    .box td { padding: 4px 8px; vertical-align: top; }
    .lbl { font-weight: bold; color: #111827; width: 34%; background: #eef0f6; }
    .colon { width: 3%; text-align: center; background: #eef0f6; }
    .val { color: #1f2937; }

    .grid { width: 100%; margin-bottom: 6px; }
    .grid > tbody > tr > td, .grid > tr > td { vertical-align: top; padding: 0; }
    .gap { width: 2%; }

    .items { width: 100%; border: 1px solid #6b7280; margin-top: 2px; }
    .items th { background: #1f2a5a; color: #fff; font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 7px 6px; border-right: 1px solid #fff; }
    .items td { padding: 6px; border-right: 1px solid #9ca3af; font-size: 9.5px; vertical-align: top; }
    .items tbody tr td { border-bottom: 1px solid #e5e7eb; }
    .items .filler td { height: 14px; border-bottom: none; }
    .num { text-align: right; font-family: 'Courier', monospace; }

    .totals { width: 100%; border: 1px solid #6b7280; border-top: none; }
    .totals td { padding: 6px 8px; border-top: 1px solid #9ca3af; font-size: 10px; }
    .totals .amt { width: 22%; text-align: right; font-family: 'Courier', monospace; border-left: 1px solid #9ca3af; }
    .totals .grand td { font-weight: bold; font-size: 11px; background: #eef0f6; }

    .words { width: 100%; border: 1px solid #6b7280; border-radius: 6px; margin-top: 8px; }
    .words td { padding: 5px 8px; }

    .notes { margin-top: 8px; font-size: 8.5px; color: #b4532a; font-weight: bold; }
    .sign { width: 100%; margin-top: 34px; }
    .sign td { width: 33%; font-size: 9px; color: #374151; padding-right: 14px; }
    .sign .line { border-top: 1px dotted #374151; padding-top: 3px; }
    .credit { margin-top: 16px; text-align: center; font-size: 7.5px; color: #9ca3af; }
</style>
</head>
<body>
    <table class="head">
        {{-- Row 1: logo beside the company name --}}
        <tr>
            @if($logoDataUri)
                <td class="logo-cell"><img src="{{ $logoDataUri }}" class="logo" alt="{{ $company['name'] }}"></td>
            @endif
            <td class="name-cell"><p class="co-name">{{ strtoupper($company['legal_name']) }}</p></td>
        </tr>
        {{-- Rows below: contact lines centred across the header --}}
        <tr>
            <td colspan="{{ $logoDataUri ? 2 : 1 }}" class="info-cell">
                @php
                    // Contact lines: each item is [icon key or null, text]; empty items are skipped.
                    $contactLines = [
                        [['pin', $company['address']]],
                        [['phone', $company['phone']], ['chat', $company['whatsapp']], ['mail', $company['email']]],
                        [['web', $company['website']], [null, $company['branches'] ? 'Branches: '.$company['branches'] : null]],
                    ];
                @endphp
                @foreach($contactLines as $items)
                    @php $items = array_values(array_filter($items, fn ($item) => filled($item[1]))); @endphp
                    @if($items)
                        <table class="info-line"><tr>
                            @foreach($items as $n => [$icon, $text])
                                @if($n > 0)<td class="sp"></td>@endif
                                @if($icon)<td class="i"><img src="{{ $icons[$icon] }}" alt=""></td>@endif
                                <td class="t">{{ $text }}</td>
                            @endforeach
                        </tr></table>
                    @endif
                @endforeach
                @if(false)
                    <div class="co-line">VAT Reg. No: {{ $company['vat_reg_no'] }}</div>
                @endif
                @if($company['tagline'])<div class="co-tag">{{ $company['tagline'] }}</div>@endif
            </td>
        </tr>
    </table>

    <div class="head-rule"></div>

    <div class="title">PURCHASE ORDER &nbsp;·&nbsp; STOCK TRANSFER</div>

    {{-- PO number / date --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">PO No</td><td class="colon">:</td><td class="val"><b>{{ $transfer->po_no ?: '—' }}</b></td></tr>
                    <tr><td class="lbl">Transfer Ref</td><td class="colon">:</td><td class="val">{{ $transfer->transfer_no }}</td></tr>
                </table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">Date</td><td class="colon">:</td><td class="val">{{ $transfer->transferred_at?->format('Y-m-d') }}</td></tr>
                    <tr><td class="lbl">Prepared By</td><td class="colon">:</td><td class="val">{{ $transfer->creator?->name ?? '—' }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- From / To stores --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl" style="width: 100%;">FROM (issuing store) &nbsp;{{ $fromStore?->code }}</td></tr>
                    <tr><td class="val">@foreach($storeLines($fromStore) as $line){{ $line }}<br>@endforeach</td></tr>
                </table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl" style="width: 100%;">TO (receiving store) &nbsp;{{ $toStore?->code }}</td></tr>
                    <tr><td class="val">@foreach($storeLines($toStore) as $line){{ $line }}<br>@endforeach</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Items --}}
    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 13%;">Item Code</th>
                <th>Description</th>
                <th style="width: 13%;">Rack / Shelf</th>
                <th style="width: 9%;">Unit</th>
                <th style="width: 9%;">Qty</th>
                <th style="width: 11%;">Received</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transfer->items as $i => $item)
                <tr>
                    <td style="text-align: center;">{{ $i + 1 }}</td>
                    <td>{{ $item->product?->item_code ?: $item->product?->item_no }}</td>
                    <td>
                        {{ $item->product?->name ?? 'Deleted product' }}
                        @if($item->notes)<div style="color: #6b7280; font-size: 8.5px;">{{ $item->notes }}</div>@endif
                    </td>
                    <td>{{ $item->product?->shelf_location }}</td>
                    <td style="text-align: center;">{{ $item->product?->unit ?: 'pc' }}</td>
                    <td class="num" style="text-align: center;"><b>{{ $item->quantity }}</b></td>
                    <td></td>
                </tr>
            @endforeach
            @for($f = $transfer->items->count(); $f < 6; $f++)
                <tr class="filler"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            @endfor
        </tbody>
    </table>
    <table class="totals">
        <tr class="grand">
            <td>Total items: {{ $transfer->items->count() }}</td>
            <td class="amt" style="text-align: center; width: 20%;">Total qty: {{ $totalQty }}</td>
        </tr>
    </table>

    @if($transfer->notes)
        <table class="words"><tr><td><b>Notes:</b> {!! nl2br(e($transfer->notes)) !!}</td></tr></table>
    @endif

    <table class="sign">
        <tr>
            <td><div class="line">Issued By ({{ $fromStore?->code }})</div></td>
            <td><div class="line">Delivered By</div></td>
            <td><div class="line">Received By ({{ $toStore?->code }})</div></td>
        </tr>
    </table>

    <div class="credit">Software by Calcify Int &nbsp;·&nbsp; +94 71 717 0333 &nbsp;·&nbsp; www.calcifyint.com</div>
</body>
</html>
