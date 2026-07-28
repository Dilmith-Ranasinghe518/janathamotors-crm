<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    protected array $keys = ['company_name', 'company_tagline', 'invoice_prefix', 'tax_rate', 'default_theme'];

    public function index()
    {
        return collect($this->keys)->mapWithKeys(fn ($key) => [$key => Setting::get($key)]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['sometimes', 'string', 'max:255'],
            'company_tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'invoice_prefix' => ['sometimes', 'string', 'max:20'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'default_theme' => ['sometimes', 'in:light,dark'],
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return collect($this->keys)->mapWithKeys(fn ($key) => [$key => Setting::get($key)]);
    }
}
