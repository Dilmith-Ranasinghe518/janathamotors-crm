<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/*
 * Stock transfers write 'transfer_out' / 'transfer_in' ledger entries, but the column only allowed
 * purchase/sale/adjustment/return, so every transfer failed. Allow the two transfer types.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_ledger MODIFY type ENUM('purchase','sale','adjustment','return','transfer_in','transfer_out') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_ledger MODIFY type ENUM('purchase','sale','adjustment','return') NOT NULL");
        }
    }
};
