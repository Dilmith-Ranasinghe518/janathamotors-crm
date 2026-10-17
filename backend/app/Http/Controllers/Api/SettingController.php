<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    protected array $keys = [
        'company_name',
        'company_tagline',
        'company_legal_name',
        'company_address',
        'company_phone',
        'company_whatsapp',
        'company_email',
        'company_website',
        'company_branches',
        'vat_reg_no',
        'business_reg_no',
        'invoice_footer_note',
        'invoice_prefix',
        'tax_rate',
        'default_theme',
        'maintenance_mode',
        'maintenance_message',
        'maintenance_enabled_at',
    ];

    public function index()
    {
        $settings = collect($this->keys)->mapWithKeys(fn ($key) => [$key => Setting::get($key)]);
        $settings['maintenance_mode'] = $settings['maintenance_mode'] === 'true' || $settings['maintenance_mode'] === '1';

        return $settings;
    }

    public function publicStatus()
    {
        $isMaintenance = Setting::get('maintenance_mode') === 'true' || Setting::get('maintenance_mode') === '1';

        return response()->json([
            'maintenance_mode' => $isMaintenance,
            'maintenance_message' => Setting::get('maintenance_message')
                ?: 'System is currently under maintenance. Only administrators can sign in at this time.',
            'maintenance_enabled_at' => Setting::get('maintenance_enabled_at'),
        ]);
    }

    public function toggleMaintenance(Request $request)
    {
        $request->validate([
            'enabled' => ['required', 'boolean'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $enabled = $request->boolean('enabled');
        $message = $request->input('message');

        Setting::set('maintenance_mode', $enabled ? 'true' : 'false');
        if ($request->has('message') && ! empty($message)) {
            Setting::set('maintenance_message', $message);
        }

        $terminatedCount = 0;

        if ($enabled) {
            Setting::set('maintenance_enabled_at', now()->toIso8601String());

            // Immediately terminate all non-admin sessions across the entire system
            $nonAdminUserIds = User::whereDoesntHave('roles', function ($q) {
                $q->where('name', 'Admin');
            })->pluck('id');

            $terminatedCount = DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $nonAdminUserIds)
                ->delete();
        } else {
            Setting::set('maintenance_enabled_at', null);
        }

        return response()->json([
            'maintenance_mode' => $enabled,
            'maintenance_message' => Setting::get('maintenance_message'),
            'maintenance_enabled_at' => Setting::get('maintenance_enabled_at'),
            'terminated_sessions_count' => $terminatedCount,
            'message' => $enabled
                ? "Maintenance mode enabled. {$terminatedCount} active session(s) terminated immediately."
                : 'Maintenance mode disabled. System returned to normal operation.',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['sometimes', 'string', 'max:255'],
            'company_tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_legal_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'company_phone' => ['sometimes', 'nullable', 'string', 'max:100'],
            'company_whatsapp' => ['sometimes', 'nullable', 'string', 'max:50'],
            'company_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'company_website' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_branches' => ['sometimes', 'nullable', 'string', 'max:255'],
            'vat_reg_no' => ['sometimes', 'nullable', 'string', 'max:50'],
            'business_reg_no' => ['sometimes', 'nullable', 'string', 'max:50'],
            'invoice_footer_note' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'invoice_prefix' => ['sometimes', 'string', 'max:20'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'default_theme' => ['sometimes', 'in:light,dark'],
            'maintenance_mode' => ['sometimes', 'boolean'],
            'maintenance_message' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (array_key_exists('maintenance_mode', $data)) {
            $isEnabling = (bool) $data['maintenance_mode'];
            $data['maintenance_mode'] = $isEnabling ? 'true' : 'false';

            if ($isEnabling) {
                Setting::set('maintenance_enabled_at', now()->toIso8601String());

                $nonAdminUserIds = User::whereDoesntHave('roles', function ($q) {
                    $q->where('name', 'Admin');
                })->pluck('id');

                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $nonAdminUserIds)
                    ->delete();
            } else {
                Setting::set('maintenance_enabled_at', null);
            }
        }

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        $settings = collect($this->keys)->mapWithKeys(fn ($key) => [$key => Setting::get($key)]);
        $settings['maintenance_mode'] = $settings['maintenance_mode'] === 'true' || $settings['maintenance_mode'] === '1';

        return $settings;
    }
}
