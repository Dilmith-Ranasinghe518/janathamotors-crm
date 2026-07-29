<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 25px 30px; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4; }
    
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .header-table td { vertical-align: top; }
    
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
    .tagline { color: #64748b; margin: 2px 0 0; font-size: 10px; font-weight: 600; }
    .logo-img { max-height: 50px; width: auto; margin-bottom: 4px; }
    .company-info { font-size: 9.5px; color: #475569; line-height: 1.4; margin-top: 4px; }
    .company-info strong { color: #0f172a; }
    
    .inv-title { font-size: 22px; font-weight: 800; color: #d97706; text-transform: uppercase; text-align: right; margin: 0; }
    .inv-details { text-align: right; font-size: 10px; color: #475569; margin-top: 4px; }
    .inv-details strong { color: #0f172a; }
    
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .status-paid { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .status-partial { background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .status-due { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .status-cancelled { background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
    
    .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { vertical-align: top; font-size: 10.5px; color: #334155; }
    .info-title { font-size: 9px; font-weight: 800; text-transform: uppercase; tracking: 0.5px; color: #64748b; margin-bottom: 4px; }
    .info-value { font-size: 11px; font-weight: 700; color: #0f172a; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .items-table th { background-color: #0f172a; color: #ffffff; padding: 8px 10px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: none; }
    .items-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; color: #1e293b; }
    .items-table tr:nth-child(even) td { background-color: #f8fafc; }
    
    .num { text-align: right; font-family: 'Courier', monospace; font-weight: 600; }
    .sku-badge { font-family: 'Courier', monospace; font-size: 9.5px; font-weight: 700; color: #475569; background: #e2e8f0; padding: 2px 5px; border-radius: 4px; }
    .brand-badge { font-size: 9px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 2px 5px; border-radius: 4px; margin-left: 4px; }
    
    .bottom-layout { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .bottom-layout td { vertical-align: top; }
    
    .notes-box { font-size: 9.5px; color: #64748b; line-height: 1.5; padding-right: 20px; }
    .notes-box strong { color: #334155; }
    
    .totals-table { width: 270px; border-collapse: collapse; margin-left: auto; }
    .totals-table td { padding: 4px 8px; font-size: 10.5px; color: #334155; }
    .totals-table .grand-row td { background-color: #fef3c7; border-top: 2px solid #d97706; border-bottom: 2px solid #d97706; font-size: 13px; font-weight: 800; color: #92400e; padding: 6px 8px; }
    
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>
    <!-- Top Header -->
    <table class="header-table">
        <tr>
            <td style="width: 58%;">
                @if($logoDataUri)
                    <img src="{{ $logoDataUri }}" alt="{{ $company['name'] }}" class="logo-img">
                @else
                    <p class="company-name">{{ $company['name'] }}</p>
                    <p class="tagline">{{ $company['tagline'] }}</p>
                @endif
                <div class="company-info">
                    <strong>Janatha Motors</strong> • We Give You The Best<br>
                    Federal Motors Building, 153 1/4, 1st Floor, Panchikawatta Road, Colombo 01000<br>
                    <strong>Phone:</strong> 071 319 0234 &nbsp;|&nbsp; <strong>WhatsApp:</strong> 076 132 1950<br>
                    <strong>Email:</strong> janathamotors@gmail.com
                </div>
            </td>
            <td style="width: 42%;">
                <p class="inv-title">INVOICE</p>
                <div class="inv-details">
                    <div><strong>Invoice No:</strong> #{{ $invoice->invoice_no }}</div>
                    <div><strong>Date:</strong> {{ $invoice->created_at->format('Y-m-d') }}</div>
                    <div style="margin-top: 4px;">
                        <span class="status-badge status-{{ $invoice->status }}">{{ $invoice->status }}</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Customer & Vehicle Card -->
    <div class="info-card">
        <table class="info-table">
            <tr>
                <td style="width: 50%; border-right: 1px solid #cbd5e1; padding-right: 12px;">
                    <div class="info-title">Billed To (Customer)</div>
                    <div class="info-value">{{ $invoice->customer_name ?? $invoice->customer->name ?? 'Walk-in Customer' }}</div>
                    @if($invoice->customer_phone || $invoice->customer?->phone)
                        <div style="color: #64748b; margin-top: 2px;">Phone: {{ $invoice->customer_phone ?? $invoice->customer->phone }}</div>
                    @endif
                </td>
                <td style="width: 50%; padding-left: 12px;">
                    <div class="info-title">Vehicle Information</div>
                    @if($invoice->vehicle_no || $invoice->vehicle_model || $invoice->vehicle_year)
                        @if($invoice->vehicle_no)
                            <div>Reg No: <span style="font-family: monospace; font-weight: 800; color: #d97706; background: #fff3dc; padding: 1px 4px; border-radius: 3px;">{{ $invoice->vehicle_no }}</span></div>
                        @endif
                        <div style="margin-top: 2px; color: #475569;">
                            @if($invoice->vehicle_model) <strong>Model:</strong> {{ $invoice->vehicle_model }} &nbsp; @endif
                            @if($invoice->vehicle_year) <strong>Year:</strong> {{ $invoice->vehicle_year }} @endif
                        </div>
                    @else
                        <div style="color: #94a3b8; font-style: italic;">No vehicle details recorded</div>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 18%;">SKU</th>
                <th style="width: 39%;">Item Description</th>
                <th style="width: 8%; text-align: center;">Qty</th>
                <th style="width: 10%; text-align: right;">Unit Price</th>
                <th style="width: 10%; text-align: right;">Discount</th>
                <th style="width: 10%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
            <tr>
                <td style="text-align: center; color: #64748b; font-weight: bold;">{{ $index + 1 }}</td>
                <td><span class="sku-badge">{{ $item->product->sku }}</span></td>
                <td>
                    <strong>{{ $item->product->name }}</strong>
                    @if($item->product->brand)
                        <span class="brand-badge">{{ $item->product->brand->name }}</span>
                    @endif
                </td>
                <td style="text-align: center; font-weight: 700;">{{ $item->quantity }}</td>
                <td class="num">{{ number_format($item->unit_price, 2) }}</td>
                <td class="num">{{ number_format($item->discount, 2) }}</td>
                <td class="num" style="font-weight: 800; color: #0f172a;">{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Bottom Layout (Notes & Financial Totals) -->
    <table class="bottom-layout">
        <tr>
            <td style="width: 50%;">
                <div class="notes-box">
                    <strong>Payment Terms & Conditions:</strong><br>
                    • All spare parts carry standard manufacturer warranty.<br>
                    • Please retain this original invoice for any warranty claims.<br>
                    • Thank you for choosing Janatha Motors!
                </div>
            </td>
            <td style="width: 50%;">
                <table class="totals-table">
                    <tr>
                        <td>Subtotal</td>
                        <td class="num">LKR {{ number_format($invoice->subtotal, 2) }}</td>
                    </tr>
                    @if($invoice->discount > 0)
                    <tr>
                        <td>Invoice Discount</td>
                        <td class="num" style="color: #b91c1c;">- LKR {{ number_format($invoice->discount, 2) }}</td>
                    </tr>
                    @endif
                    @if($invoice->tax > 0)
                    <tr>
                        <td>Tax / VAT</td>
                        <td class="num">LKR {{ number_format($invoice->tax, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="grand-row">
                        <td>Grand Total</td>
                        <td class="num">LKR {{ number_format($invoice->total, 2) }}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 6px;">Amount Paid</td>
                        <td class="num" style="padding-top: 6px; color: #15803d; font-weight: 700;">LKR {{ number_format($invoice->paid_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td>Balance Due</td>
                        <td class="num" style="color: #b91c1c; font-weight: 700;">LKR {{ number_format($invoice->due_amount, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        Issued by <strong>Janatha Motors Panchikawatta</strong> on {{ $invoice->created_at->format('Y-m-d H:i') }}
        <div style="margin-top: 4px; font-size: 8.5px; color: #94a3b8; letter-spacing: 0.3px;">
            Software Developed by <strong>Calcify Int</strong>
        </div>
    </div>
</body>
</html>
