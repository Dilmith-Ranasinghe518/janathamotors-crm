{{--
    One layout for every bill.
    $isVat = true  → TAX INVOICE: TINs, VAT reg. no, amounts excluding VAT and the VAT breakdown.
    $isVat = false → INVOICE / CREDIT BILL: same layout, VAT-inclusive prices, no VAT details.
--}}
@php
    $purchaserName = $invoice->customer_name ?: ($invoice->customer?->name ?: 'Walk-in Customer');
    $purchaserAddress = $invoice->customer_address ?: $invoice->customer?->address;
    $purchaserPhone = $invoice->customer_phone ?: $invoice->customer?->phone;
    $hasLineDiscount = ! $isVat && $invoice->items->contains(fn ($item) => (float) $item->discount > 0);
    $title = $isVat ? 'TAX INVOICE' : ($invoice->is_credit ? 'CREDIT BILL' : 'INVOICE');
    $rate = rtrim(rtrim(number_format($vat['rate'], 2), '0'), '.');
@endphp
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
    .co-tag { font-size: 9.5px; font-weight: bold; color: #b4532a; margin-top: 3px; }
    .accent-bar { height: 4px; background: #b4532a; margin: 6px 0 4px; }

    .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #111827; margin: 6px 0 8px; }
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
                @if(($isVat && $company['vat_reg_no']) || $company['business_reg_no'])
                    <div class="co-line">
                        @if($isVat && $company['vat_reg_no'])<strong>VAT Reg. No:</strong> {{ $company['vat_reg_no'] }} &nbsp;&nbsp; @endif
                        @if($company['business_reg_no'])<strong>Business Reg. No:</strong> {{ $company['business_reg_no'] }}@endif
                    </div>
                @endif
                @if($company['tagline'])<div class="co-tag">{{ $company['tagline'] }}</div>@endif
            </td>
        </tr>
    </table>
    <div class="accent-bar"></div>

    <div class="title">{{ $title }}</div>
    @unless($isVat)
        <div class="status"><span class="status-{{ $invoice->status }}">{{ $invoice->status }}</span></div>
    @endunless

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
                    <td class="lbl">{{ $isVat ? 'Tax Invoice No.' : 'Invoice No.' }}</td><td class="colon">:</td>
                    <td class="val"><strong>{{ $invoice->invoice_no }}</strong></td>
                </tr></table>
            </td>
        </tr>
    </table>

    {{-- Seller / customer --}}
    <table class="grid">
        <tr>
            <td style="width: 49%;">
                <table class="box">
                    @if($isVat)
                        <tr><td class="lbl">Supplier's TIN</td><td class="colon">:</td><td class="val">{{ $company['vat_reg_no'] ?: '—' }}</td></tr>
                    @endif
                    <tr><td class="lbl">{{ $isVat ? "Supplier's Name" : 'Seller' }}</td><td class="colon">:</td><td class="val">{{ $company['legal_name'] }}</td></tr>
                    <tr><td class="lbl">Address</td><td class="colon">:</td><td class="val">{{ $company['address'] ?: '—' }}</td></tr>
                    <tr><td class="lbl">Telephone No.</td><td class="colon">:</td><td class="val">{{ $company['phone'] ?: '—' }}</td></tr>
                </table>
            </td>
            <td class="gap"></td>
            <td style="width: 49%;">
                <table class="box">
                    @if($isVat)
                        <tr><td class="lbl">Purchaser's TIN</td><td class="colon">:</td><td class="val">{{ $purchaserTin }}</td></tr>
                    @endif
                    <tr><td class="lbl">{{ $isVat ? "Purchaser's Name" : 'Customer' }}</td><td class="colon">:</td><td class="val">{{ $purchaserName }}</td></tr>
                    @if($isVat || $purchaserAddress)
                        <tr><td class="lbl">Address</td><td class="colon">:</td><td class="val">{{ $purchaserAddress ?: '—' }}</td></tr>
                    @endif
                    <tr><td class="lbl">Telephone No.</td><td class="colon">:</td><td class="val">{{ $purchaserPhone ?: '—' }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Delivery / place of supply --}}
    @if($isVat || $invoice->place_of_supply)
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
                        <td class="lbl">{{ $isVat ? 'Place of Supply' : 'Delivered To' }}</td><td class="colon">:</td>
                        <td class="val">{{ $invoice->place_of_supply ?: '—' }}</td>
                    </tr></table>
                </td>
            </tr>
        </table>
    @endif

    {{-- Additional information --}}
    <table class="box" style="margin-bottom: 8px;">
        <tr><td>
            <strong>Additional Information if any :</strong>
            <span style="margin-left: 10px;">Vehicle No : {{ $invoice->vehicle_no ?: '—' }}</span>
            @if($invoice->vehicle_model)<span style="margin-left: 10px;">Model : {{ $invoice->vehicle_model }}</span>@endif
            @if($invoice->vehicle_year)<span style="margin-left: 10px;">Year : {{ $invoice->vehicle_year }}</span>@endif
            @if($invoice->additional_info)<div style="margin-top: 3px;">{{ $invoice->additional_info }}</div>@endif
        </td></tr>
    </table>

    {{-- Line items --}}
    <table class="items">
        <thead>
            <tr>
                <th style="width: 14%; text-align: left;">Reference</th>
                <th style="text-align: left;">Description of Goods or Services</th>
                <th style="width: 8%;">Qty.</th>
                @if($isVat)
                    <th style="width: 15%; text-align: right;">Unit Price<br><span style="font-weight: normal; text-transform: none;">(excl. VAT)</span></th>
                    <th style="width: 19%; text-align: right; border-right: none;">Amount Excluding<br>VAT (Rs.)</th>
                @else
                    <th style="width: 14%; text-align: right;">Unit Price</th>
                    @if($hasLineDiscount)<th style="width: 12%; text-align: right;">Discount</th>@endif
                    <th style="width: 17%; text-align: right; border-right: none;">Amount (Rs.)</th>
                @endif
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
                    @if($isVat)
                        <td class="num">{{ number_format($line['unit_excl'], 2) }}</td>
                        <td class="num" style="border-right: none;">{{ number_format($line['amount_excl'], 2) }}</td>
                    @else
                        <td class="num">{{ number_format($line['item']->unit_price, 2) }}</td>
                        @if($hasLineDiscount)<td class="num">{{ number_format($line['item']->discount, 2) }}</td>@endif
                        <td class="num" style="border-right: none;">{{ number_format($line['item']->line_total, 2) }}</td>
                    @endif
                </tr>
            @endforeach
            @for($i = count($vat['lines']); $i < 6; $i++)
                <tr class="filler">
                    <td></td><td></td><td></td><td></td>
                    @if($hasLineDiscount)<td></td>@endif
                    <td style="border-right: none;"></td>
                </tr>
            @endfor
        </tbody>
    </table>

    <table class="totals">
        @if($isVat)
            @if($vat['discount_excl'] > 0)
                <tr><td>Less: Discount (excl. VAT)</td><td class="amt">({{ number_format($vat['discount_excl'], 2) }})</td></tr>
            @endif
            <tr><td><strong>Total Value of Supply</strong></td><td class="amt">{{ number_format($vat['supply'], 2) }}</td></tr>
            <tr><td><strong>VAT Amount</strong> (Total Value of Supply @ {{ $rate }}%)</td><td class="amt">{{ number_format($vat['vat_amount'], 2) }}</td></tr>
            <tr class="grand"><td>Total Amount Including VAT</td><td class="amt">{{ number_format($vat['total'], 2) }}</td></tr>
        @else
            @if((float) $invoice->discount > 0 || (float) $invoice->tax > 0)
                <tr><td>Subtotal</td><td class="amt">{{ number_format($invoice->subtotal, 2) }}</td></tr>
            @endif
            @if((float) $invoice->discount > 0)
                <tr><td>Less: Discount</td><td class="amt">({{ number_format($invoice->discount, 2) }})</td></tr>
            @endif
            @if((float) $invoice->tax > 0)
                <tr><td>Tax</td><td class="amt">{{ number_format($invoice->tax, 2) }}</td></tr>
            @endif
            <tr class="grand"><td>Total Amount</td><td class="amt">{{ number_format($invoice->total, 2) }}</td></tr>
            <tr><td>Amount Paid</td><td class="amt">{{ number_format($invoice->paid_amount, 2) }}</td></tr>
            <tr><td><strong>Balance Due</strong></td><td class="amt"><strong>{{ number_format($invoice->due_amount, 2) }}</strong></td></tr>
        @endif
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
