<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Item No becomes a system-generated number; the codes staff typed so far move to Item Code.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('item_no')->nullable()->change();
        });

        DB::table('products')->whereNull('item_code')->orWhere('item_code', '')->update(['item_code' => DB::raw('item_no')]);

        DB::table('products')->orderBy('id')->select('id')->each(function ($row) {
            DB::table('products')->where('id', $row->id)->update(['item_no' => sprintf('JM-%06d', $row->id)]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('products')->whereNotNull('item_code')->update(['item_no' => DB::raw('item_code')]);

        Schema::table('products', function (Blueprint $table) {
            $table->string('item_no')->nullable(false)->change();
        });
    }
};
