<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);
        $this->call(StoreSeeder::class);

        // No built-in default password: use ADMIN_PASSWORD from .env, or a random one shown once.
        $admin = User::where('email', 'admin@janathamotors.lk')->first();
        if (! $admin) {
            $password = env('ADMIN_PASSWORD') ?: \Illuminate\Support\Str::password(16, symbols: false);
            $admin = User::create([
                'email' => 'admin@janathamotors.lk',
                'name' => 'Janatha Motors Admin',
                'password' => $password,
                'is_active' => true,
            ]);
            $this->command?->warn('Admin account created: admin@janathamotors.lk / '.$password.' (change it after signing in)');
        }
        $admin->assignRole('Admin');

        Setting::set('company_name', 'Janatha Motors');
        Setting::set('company_tagline', 'We give you the best');
        Setting::set('invoice_prefix', 'JM-INV-');
        Setting::set('tax_rate', '0');
        Setting::set('default_theme', 'light');
    }
}
