{{-- Delivery note / parcel label: "From" (our business) and "To" (the customer), A5 portrait. --}}
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { size: A5 portrait; margin: 22px 26px; }
    body { font-family: Helvetica, Arial, sans-serif; color: #c62828; }
    .label { font-size: 15px; font-weight: bold; margin: 0; }
    .from-block { text-align: center; margin-top: 2px; }
    .name { font-size: 30px; font-weight: bold; margin: 0 0 6px; letter-spacing: 0.3px; }
    .tagline { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .line { font-size: 10.5px; font-weight: bold; margin-bottom: 3px; }
    .brands { margin: 10px auto 0; }
    .brands td { padding: 0 5px; }
    .brand { display: inline-block; border: 1.5px solid #c62828; border-radius: 4px; padding: 3px 7px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
    .to { margin-top: 26px; border-top: 1.5px dashed #c62828; padding-top: 14px; }
    .to-name { font-size: 22px; font-weight: bold; color: #111827; margin: 10px 0 6px 18px; }
    .to-line { font-size: 14px; color: #111827; margin: 0 0 6px 18px; line-height: 1.35; }
    .to-phone { font-size: 16px; font-weight: bold; color: #111827; margin: 6px 0 0 18px; }
    .meta { margin-top: 22px; border-top: 1px solid #e5b4b4; padding-top: 6px; font-size: 9.5px; color: #6b7280; }
    .meta strong { color: #374151; }
</style>
</head>
<body>
    <p class="label">From :</p>
    <div class="from-block">
        <p class="name">{{ $company['name'] }}</p>
        @if($company['delivery_tagline'])<div class="tagline">{{ $company['delivery_tagline'] }}</div>@endif
        @foreach(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $company['address']))) as $addressLine)
            <div class="line">{{ $addressLine }}</div>
        @endforeach
        <div class="line">
            @if($company['phone'])Tel: {{ $company['phone'] }}@endif{{ $company['phone'] && $company['whatsapp'] ? ',' : '' }}
            @if($company['whatsapp'])WhatsApp: {{ $company['whatsapp'] }}@endif
        </div>
        @if($company['email'])<div class="line">{{ $company['email'] }}</div>@endif

        @if($brands)
            <table class="brands"><tr>
                @foreach($brands as $brand)
                    <td><span class="brand">{{ $brand }}</span></td>
                @endforeach
            </tr></table>
        @endif
    </div>

    <div class="to">
        <p class="label">To :</p>
        <div class="to-name">{{ $recipient['name'] }}</div>
        @foreach($recipient['address_lines'] as $addressLine)
            <div class="to-line">{{ $addressLine }}</div>
        @endforeach
        @if($recipient['phone'])<div class="to-phone">Tel: {{ $recipient['phone'] }}</div>@endif
    </div>

    <div class="meta">
        <strong>Ref:</strong> {{ $invoice->invoice_no }} &nbsp;·&nbsp; {{ $invoice->created_at->format('d/m/Y') }}
        @if($shipping) &nbsp;·&nbsp; <strong>Via:</strong> {{ $shipping }}@endif
    </div>
</body>
</html>
