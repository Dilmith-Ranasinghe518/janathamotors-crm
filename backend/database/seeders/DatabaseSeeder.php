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

        $admin = User::firstOrCreate(
            ['email' => 'admin@janathamotors.lk'],
            ['name' => 'Janatha Motors Admin', 'password' => 'password', 'is_active' => true]
        );
        $admin->assignRole('Admin');

        Setting::set('company_name', 'Janatha Motors');
        Setting::set('company_tagline', 'We give you the best');
        Setting::set('invoice_prefix', 'JM-INV-');
        Setting::set('tax_rate', '0');
        Setting::set('default_theme', 'light');
    }
}
