<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Each stock transfer gets a PO number (JMPO/2026/00001), numbered per year.
 * Transfers made before this are numbered in date order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('po_no', 40)->nullable()->unique()->after('transfer_no');
        });

        $counters = [];
        foreach (DB::table('stock_transfers')->orderBy('transferred_at')->orderBy('id')->get(['id', 'transferred_at']) as $row) {
            $year = substr((string) $row->transferred_at, 0, 4) ?: date('Y');
            $counters[$year] = ($counters[$year] ?? 0) + 1;
            DB::table('stock_transfers')->where('id', $row->id)
                ->update(['po_no' => sprintf('JMPO/%s/%05d', $year, $counters[$year])]);
        }
    }

    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropUnique(['po_no']);
            $table->dropColumn('po_no');
        });
    }
};
