<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #1c1a17; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1c1a17; padding-bottom: 10px; margin-bottom: 16px; }
    .brand { display: flex; align-items: center; }
    .brand img { height: 64px; width: auto; margin-right: 12px; }
    .company-name { font-size: 20px; font-weight: bold; margin: 0; }
    .tagline { color: #6b6459; margin: 2px 0 0; font-size: 11px; }
    .meta { text-align: right; }
    .meta div { margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #ddd6c9; text-align: left; }
    th { background: #f3f0e9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .num { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 12px; }
    .totals td { border-bottom: none; padding: 3px 8px; }
    .totals .grand { font-weight: bold; font-size: 14px; border-top: 1px solid #1c1a17; }
    .status { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; text-transform: uppercase; }
    .status-paid { background: #dff0e2; color: #3f7d4f; }
    .status-partial { background: #fdf1dc; color: #9c6a1f; }
    .status-due { background: #fbe4e4; color: #b23b3b; }
    .status-cancelled { background: #e5e5e5; color: #6b6459; }
</style>
</head>
<body>
    <div class="header">
        <div class="brand">
            @if($logoDataUri)
                <img src="{{ $logoDataUri }}" alt="{{ $company['name'] }}">
            @else
                <div>
                    <p class="company-name">{{ $company['name'] }}</p>
                    <p class="tagline">{{ $company['tagline'] }}</p>
                </div>
            @endif
        </div>
        <div class="meta">
            <div><strong>Invoice</strong> #{{ $invoice->invoice_no }}</div>
            <div>Date: {{ $invoice->created_at->format('Y-m-d') }}</div>
            <div>Status: <span class="status status-{{ $invoice->status }}">{{ $invoice->status }}</span></div>
        </div>
    </div>

    <div>
        <strong>Bill to:</strong>
        {{ $invoice->customer->name ?? 'Walk-in customer' }}
        @if($invoice->customer?->phone) &middot; {{ $invoice->customer->phone }} @endif
        @if($invoice->customer?->vehicle_no) &middot; Vehicle: {{ $invoice->customer->vehicle_no }} @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Item</th>
                <th class="num">Qty</th>
                <th class="num">Unit Price</th>
                <th class="num">Discount</th>
                <th class="num">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
            <tr>
                <td>{{ $item->product->sku }}</td>
                <td>{{ $item->product->name }}</td>
                <td class="num">{{ $item->quantity }}</td>
                <td class="num">{{ number_format($item->unit_price, 2) }}</td>
                <td class="num">{{ number_format($item->discount, 2) }}</td>
                <td class="num">{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal</td><td class="num">{{ number_format($invoice->subtotal, 2) }}</td></tr>
        <tr><td>Discount</td><td class="num">-{{ number_format($invoice->discount, 2) }}</td></tr>
        <tr><td>Tax</td><td class="num">{{ number_format($invoice->tax, 2) }}</td></tr>
        <tr class="grand"><td>Total</td><td class="num">{{ number_format($invoice->total, 2) }}</td></tr>
        <tr><td>Paid</td><td class="num">{{ number_format($invoice->paid_amount, 2) }}</td></tr>
        <tr><td>Due</td><td class="num">{{ number_format($invoice->due_amount, 2) }}</td></tr>
    </table>

    <p style="margin-top: 24px; color: #6b6459;">Issued by {{ $invoice->creator->name ?? 'System' }} &middot; Thank you for your business.</p>
</body>
</html>
