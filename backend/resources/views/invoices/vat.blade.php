<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 22px 26px; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1f2937; line-height: 1.35; }
    table { border-collapse: collapse; }

    .head { width: 100%; margin-bottom: 4px; }
    .head td { vertical-align: middle; }
    .logo { max-height: 56px; width: auto; }
    .co-name { font-size: 19px; font-weight: bold; color: #1f2a5a; margin: 0; letter-spacing: -0.3px; }
    .co-line { font-size: 9px; color: #374151; margin-top: 2px; }
    .co-tag { font-size: 9.5px; font-weight: 700; color: #b4532a; margin-top: 3px; }
    .accent-bar { height: 4px; background: #b4532a; margin: 6px 0 4px; }

    .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #111827; margin: 6px 0 8px; }

    .box { width: 100%; border: 1px solid #6b7280; border-radius: 6px; }
    .box td { padding: 4px 8px; vertical-align: top; }
    .lbl { font-weight: 700; color: #111827; width: 34%; background: #eef0f6; }
    .colon { width: 3%; text-align: center; background: #eef0f6; }
    .val { color: #1f2937; }

    .grid { width: 100%; margin-bottom: 6px; }
    .grid > tbody > tr > td { vertical-align: top; padding: 0; }
    .gap { width: 2%; }

    .items { width: 100%; border: 1px solid #6b7280; margin-top: 2px; }
    .items th { background: #1f2a5a; color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 7px 6px; border-right: 1px solid #fff; }
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

    .notes { margin-top: 8px; font-size: 8.5px; color: #b4532a; font-weight: 700; }
    .sign { width: 100%; margin-top: 34px; }
    .sign td { width: 33%; font-size: 9px; color: #374151; padding-right: 14px; }
    .sign .line { border-top: 1px dotted #374151; padding-top: 3px; }
    .credit { margin-top: 16px; text-align: center; font-size: 7.5px; color: #9ca3af; }
</style>
</head>
<body>
    {{-- Business header --}}
    <table class="head">
        <tr>
            @if($logoDataUri)
                <td style="width: 70px;"><img src="{{ $logoDataUri }}" class="logo" alt="{{ $company['name'] }}"></td>
            @endif
            <td>
                <p class="co-name">{{ strtoupper($company['legal_name']) }}</p>
                @if($company['address'])<div class="co-line">{{ $company['address'] }}</div>@endif
                <div class="co-line">
                    @if($company['phone'])Tel: {{ $company['phone'] }}@endif
                    @if($company['whatsapp']) &nbsp;|&nbsp; WhatsApp: {{ $company['whatsapp'] }}@endif
                    @if($company['email']) &nbsp;|&nbsp; {{ $company['email'] }}@endif
                    @if($company['website']) &nbsp;|&nbsp; {{ $company['website'] }}@endif
                </div>
                @if($company['branches'])<div class="co-line">Branches: {{ $company['branches'] }}</div>@endif
                <div class="co-line">
                    @if($company['vat_reg_no'])<strong>VAT Reg. No:</strong> {{ $company['vat_reg_no'] }}@endif
                    @if($company['business_reg_no']) &nbsp;&nbsp; <strong>Business Reg. No:</strong> {{ $company['business_reg_no'] }}@endif
                </div>
                @if($company['tagline'])<div class="co-tag">{{ $company['tagline'] }}</div>@endif
            </td>
        </tr>
    </table>
    <div class="accent-bar"></div>

    <div class="title">TAX INVOICE</div>

    {{-- Invoice date / number --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box"><tr>
                    <td class="lbl">Date of Invoice</td><td class="colon">:</td>
                    <td class="val">{{ $invoice->created_at->format('d/m/Y') }}</td>
                </tr></table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box"><tr>
                    <td class="lbl">Tax Invoice No.</td><td class="colon">:</td>
                    <td class="val"><strong>{{ $invoice->invoice_no }}</strong></td>
                </tr></table>
            </td>
        </tr>
    </table>

    {{-- Supplier / purchaser --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">Supplier's TIN</td><td class="colon">:</td><td class="val">{{ $company['vat_reg_no'] ?: '—' }}</td></tr>
                    <tr><td class="lbl">Supplier's Name</td><td class="colon">:</td><td class="val">{{ $company['legal_name'] }}</td></tr>
                    <tr><td class="lbl">Address</td><td class="colon">:</td><td class="val">{{ $company['address'] ?: '—' }}</td></tr>
                    <tr><td class="lbl">Telephone No.</td><td class="colon">:</td><td class="val">{{ $company['phone'] ?: '—' }}</td></tr>
                </table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box">
                    <tr><td class="lbl">Purchaser's TIN</td><td class="colon">:</td><td class="val">{{ $invoice->customer_tin ?: ($invoice->customer?->tin ?: '—') }}</td></tr>
                    <tr><td class="lbl">Purchaser's Name</td><td class="colon">:</td><td class="val">{{ $invoice->customer_name ?: ($invoice->customer?->name ?: 'Walk-in Customer') }}</td></tr>
                    <tr><td class="lbl">Address</td><td class="colon">:</td><td class="val">{{ $invoice->customer_address ?: ($invoice->customer?->address ?: '—') }}</td></tr>
                    <tr><td class="lbl">Telephone No.</td><td class="colon">:</td><td class="val">{{ $invoice->customer_phone ?: ($invoice->customer?->phone ?: '—') }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Delivery / place of supply --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box"><tr>
                    <td class="lbl">Date of Delivery</td><td class="colon">:</td>
                    <td class="val">{{ ($invoice->delivery_date ?? $invoice->created_at)->format('d/m/Y') }}</td>
                </tr></table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box"><tr>
                    <td class="lbl">Place of Supply</td><td class="colon">:</td>
                    <td class="val">{{ $invoice->place_of_supply ?: '—' }}</td>
                </tr></table>
            </td>
        </tr>
    </table>

    {{-- Additional information --}}
    <table class="box" style="margin-bottom: 8px;">
        <tr><td>
            <strong>Additional Information if any :</strong>
            <span style="margin-left: 10px;">Vehicle No : {{ $invoice->vehicle_no ?: '—' }}</span>
            @if($invoice->vehicle_model)<span style="margin-left: 10px;">Model : {{ $invoice->vehicle_model }}</span>@endif
            @if($invoice->additional_info)<div style="margin-top: 3px;">{{ $invoice->additional_info }}</div>@endif
        </td></tr>
    </table>

    {{-- Line items (amounts excluding VAT) --}}
    <table class="items">
        <thead>
            <tr>
                <th style="width: 14%; text-align: left;">Reference</th>
                <th style="width: 44%; text-align: left;">Description of Goods or Services</th>
                <th style="width: 8%;">Qty.</th>
                <th style="width: 15%; text-align: right;">Unit Price<br><span style="font-weight: 400; text-transform: none;">(excl. VAT)</span></th>
                <th style="width: 19%; text-align: right; border-right: none;">Amount Excluding<br>VAT (Rs.)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($vat['lines'] as $line)
                <tr>
                    <td>{{ $line['item']->product->item_code ?: $line['item']->product->item_no }}</td>
                    <td>
                        {{ $line['item']->product->name }}
                        @if($line['item']->product->part_no)<span style="color: #6b7280;"> [{{ $line['item']->product->part_no }}]</span>@endif
                    </td>
                    <td style="text-align: center;">{{ $line['item']->quantity }}</td>
                    <td class="num">{{ number_format($line['unit_excl'], 2) }}</td>
                    <td class="num" style="border-right: none;">{{ number_format($line['amount_excl'], 2) }}</td>
                </tr>
            @endforeach
            @for($i = count($vat['lines']); $i < 6; $i++)
                <tr class="filler"><td></td><td></td><td></td><td></td><td style="border-right: none;"></td></tr>
            @endfor
        </tbody>
    </table>

    <table class="totals">
        @if($vat['discount_excl'] > 0)
            <tr><td>Less: Discount (excl. VAT)</td><td class="amt">({{ number_format($vat['discount_excl'], 2) }})</td></tr>
        @endif
        <tr><td><strong>Total Value of Supply</strong></td><td class="amt">{{ number_format($vat['supply'], 2) }}</td></tr>
        <tr><td><strong>VAT Amount</strong> (Total Value of Supply @ {{ rtrim(rtrim(number_format($vat['rate'], 2), '0'), '.') }}%)</td><td class="amt">{{ number_format($vat['vat_amount'], 2) }}</td></tr>
        <tr class="grand"><td>Total Amount Including VAT</td><td class="amt">{{ number_format($vat['total'], 2) }}</td></tr>
    </table>

    <table class="words">
        <tr><td style="width: 26%;"><strong>Total Amount In Words</strong></td><td style="width: 3%;">:</td><td>{{ $vat['words'] }}</td></tr>
        <tr><td><strong>Mode of Payment</strong></td><td>:</td><td>{{ $paymentMode ?: ($invoice->is_credit ? 'Credit' : '—') }}</td></tr>
    </table>

    @if($company['footer_note'])
        <div class="notes">{!! nl2br(e($company['footer_note'])) !!}</div>
    @endif

    <table class="sign">
        <tr>
            <td><div class="line">Prepared By{{ $invoice->creator ? ': '.$invoice->creator->name : '' }}</div></td>
            <td><div class="line">Checked By</div></td>
            <td><div class="line">Customer</div></td>
        </tr>
    </table>

    <div class="credit">Software by Calcify Int</div>
</body>
</html>
