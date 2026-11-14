<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Wording for the delivery note header (editable in Settings).
     */
    public function up(): void
    {
        $defaults = [
            'delivery_tagline' => 'Importers & Dealers in Genuine Parts Wholesale and Retail',
            'delivery_brands' => 'Mitsubishi Motors, Daihatsu, Perodua, Fiat, Toyota',
        ];
        foreach ($defaults as $key => $value) {
            if (! DB::table('settings')->where('key', $key)->exists()) {
                DB::table('settings')->insert(['key' => $key, 'value' => $value, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['delivery_tagline', 'delivery_brands'])->delete();
    }
};
