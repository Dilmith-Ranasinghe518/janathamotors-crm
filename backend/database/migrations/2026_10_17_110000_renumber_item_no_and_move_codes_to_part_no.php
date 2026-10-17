<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The codes carried over from the old SKU are part numbers, so move them to Part No,
     * and renumber the system Item No as 4400, 4401, … in the order products were added.
     */
    public function up(): void
    {
        DB::table('products')
            ->whereNotNull('item_code')
            ->where(fn ($q) => $q->whereNull('part_no')->orWhere('part_no', ''))
            ->update(['part_no' => DB::raw('item_code'), 'item_code' => null]);

        $next = 4400;
        DB::table('products')->orderBy('id')->select('id')->each(function ($row) use (&$next) {
            DB::table('products')->where('id', $row->id)->update(['item_no' => (string) $next++]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('products')->orderBy('id')->select('id')->each(function ($row) {
            DB::table('products')->where('id', $row->id)->update(['item_no' => sprintf('JM-%06d', $row->id)]);
        });
    }
};
