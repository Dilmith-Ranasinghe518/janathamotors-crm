<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Users without "apply_discount_over_limit" (e.g. Cashiers) may give at most this % off a bill.
     * Change it in Settings; clear it to remove the limit.
     */
    public function up(): void
    {
        if (! DB::table('settings')->where('key', 'max_discount_percent')->exists()) {
            DB::table('settings')->insert(['key' => 'max_discount_percent', 'value' => '10', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'max_discount_percent')->delete();
    }
};
