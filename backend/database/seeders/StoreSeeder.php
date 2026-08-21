<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockLedger;
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
                'name' => 'Janatha Motors Main Branch',
                'code' => 'JMS-01',
                'location' => 'Colombo 03',
                'address' => 'No. 124, Galle Road, Colombo 03, Sri Lanka',
                'phone' => '+94 11 234 5678',
                'email' => 'colombo@janathamotors.lk',
                'is_active' => true,
                'notes' => 'Central warehouse and main retail branch',
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

        foreach ($stores as $storeData) {
            Store::firstOrCreate(['code' => $storeData['code']], $storeData);
        }

        // Ensure JMS-01 store exists
        $jmsStore = Store::where('code', 'JMS-01')->first();

        if ($jmsStore) {
            // Assign all unassigned products to JMS-01
            Product::whereNull('store_id')->update(['store_id' => $jmsStore->id]);

            // Assign all unassigned stock ledger entries to JMS-01
            StockLedger::whereNull('store_id')->update(['store_id' => $jmsStore->id]);

            // Assign all unassigned purchases to JMS-01
            Purchase::whereNull('store_id')->update(['store_id' => $jmsStore->id]);

            // Assign all unassigned invoices to JMS-01
            Invoice::whereNull('store_id')->update(['store_id' => $jmsStore->id]);
        }
    }
}
