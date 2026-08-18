<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stores = [
            [
                'name' => 'Janatha Motors Main Head Office',
                'code' => 'MAIN-01',
                'location' => 'Colombo 03',
                'address' => 'No. 124, Galle Road, Colombo 03, Sri Lanka',
                'phone' => '+94 11 234 5678',
                'email' => 'colombo@janathamotors.lk',
                'is_active' => true,
                'notes' => 'Central warehouse and main retail store',
            ],
            [
                'name' => 'Janatha Motors Kandy Branch',
                'code' => 'KND-01',
                'location' => 'Kandy Town',
                'address' => 'No. 45, Peradeniya Road, Kandy, Sri Lanka',
                'phone' => '+94 81 223 4567',
                'email' => 'kandy@janathamotors.lk',
                'is_active' => true,
                'notes' => 'Central Province retail branch store',
            ],
            [
                'name' => 'Janatha Motors Kurunegala Outlet',
                'code' => 'KRN-01',
                'location' => 'Kurunegala',
                'address' => 'No. 88, Colombo Road, Kurunegala, Sri Lanka',
                'phone' => '+94 37 222 1100',
                'email' => 'kurunegala@janathamotors.lk',
                'is_active' => true,
                'notes' => 'Wayamba Province distribution hub',
            ],
        ];

        foreach ($stores as $store) {
            Store::firstOrCreate(['code' => $store['code']], $store);
        }
    }
}
