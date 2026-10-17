<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Item No becomes 1, 2, 3, … and the 4400-series numbers move to Item Code,
     * both in the order products were added. Item Codes staff already typed are kept.
     */
    public function up(): void
    {
        $nextNo = 1;
        $nextCode = 4400;

        DB::table('products')->orderBy('id')->select('id', 'item_code')->each(function ($row) use (&$nextNo, &$nextCode) {
            $update = ['item_no' => (string) $nextNo++];
            if ($row->item_code === null || $row->item_code === '') {
                $update['item_code'] = (string) $nextCode++;
            }
            DB::table('products')->where('id', $row->id)->update($update);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('products')->whereRaw("item_code REGEXP '^[0-9]+$'")->update([
            'item_no' => DB::raw('item_code'),
            'item_code' => null,
        ]);
    }
};
