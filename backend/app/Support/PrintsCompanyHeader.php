<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Business header shared by printed documents (bills, delivery notes, transfer POs):
 * company details from Settings, the logo and the small contact icons.
 */
trait PrintsCompanyHeader
{
    /**
     * Small SVG contact icons, as data URIs (the PDF renderer has no icon font).
     */
    private function billIcons(): array
    {
        $navy = '#1f2a5a';
        $svg = fn (string $body, string $viewBox = '0 0 24 24') => 'data:image/svg+xml;base64,'.base64_encode(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='{$viewBox}'>{$body}</svg>"
        );

        // Built from circles, ellipses and straight shapes only: the PDF renderer draws SVG arcs poorly.
        return [
            'pin' => $svg("<circle cx='12' cy='9' r='7' fill='{$navy}'/><polygon points='5.6,11.5 18.4,11.5 12,23' fill='{$navy}'/><circle cx='12' cy='9' r='2.8' fill='#fff'/>"),
            'phone' => $svg("<path fill='{$navy}' d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'/>"),
            'chat' => $svg("<circle cx='12.5' cy='11' r='9.5' fill='{$navy}'/><polygon points='3.5,15 2,23 9.5,19.5' fill='{$navy}'/><circle cx='8.5' cy='11' r='1.4' fill='#fff'/><circle cx='12.5' cy='11' r='1.4' fill='#fff'/><circle cx='16.5' cy='11' r='1.4' fill='#fff'/>"),
            'mail' => $svg("<rect x='1.5' y='4.5' width='21' height='15' rx='1.5' fill='{$navy}'/><polyline points='2.5,6 12,13 21.5,6' fill='none' stroke='#fff' stroke-width='2'/>"),
            'web' => $svg("<circle cx='12' cy='12' r='10.5' fill='{$navy}'/><ellipse cx='12' cy='12' rx='4.2' ry='10.5' fill='none' stroke='#fff' stroke-width='1.5'/><line x1='1.5' y1='12' x2='22.5' y2='12' stroke='#fff' stroke-width='1.5'/><line x1='3.5' y1='7' x2='20.5' y2='7' stroke='#fff' stroke-width='1.2'/><line x1='3.5' y1='17' x2='20.5' y2='17' stroke='#fff' stroke-width='1.2'/>"),
        ];
    }

    /** Our business details for printed bills (Settings → Business details). */
    private function companyDetails(): array
    {
        return [
            'name' => Setting::get('company_name', 'Janatha Motors'),
            'tagline' => Setting::get('company_tagline'),
            'legal_name' => Setting::get('company_legal_name') ?: Setting::get('company_name', 'Janatha Motors'),
            'address' => Setting::get('company_address'),
            'phone' => Setting::get('company_phone'),
            'whatsapp' => Setting::get('company_whatsapp'),
            'email' => Setting::get('company_email'),
            'website' => Setting::get('company_website'),
            'branches' => Setting::get('company_branches'),
            'vat_reg_no' => Setting::get('vat_reg_no'),
            'business_reg_no' => Setting::get('business_reg_no'),
            'footer_note' => Setting::get('invoice_footer_note'),
            'delivery_tagline' => Setting::get('delivery_tagline'),
            'delivery_brands' => Setting::get('delivery_brands'),
        ];
    }

    /** The company logo as a data URI for the PDF, or null. */
    private function logoDataUri(): ?string
    {
        $path = resource_path('images/logo.png');

        return file_exists($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }
}
