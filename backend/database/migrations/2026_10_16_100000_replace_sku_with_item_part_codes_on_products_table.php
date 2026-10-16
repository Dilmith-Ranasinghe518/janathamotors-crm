<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Existing SKU values carry over as the Item No.
        if (Schema::hasColumn('products', 'sku')) {
            Schema::table('products', function (Blueprint $table) {
                $table->renameColumn('sku', 'item_no');
            });
        }

        // MariaDB 10.4 has no RENAME INDEX, so recreate the unique key under its new name.
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_sku_unique');
            $table->unique('item_no');
            $table->string('part_no')->nullable()->index()->after('item_no');
            $table->string('item_code')->nullable()->index()->after('part_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['part_no']);
            $table->dropIndex(['item_code']);
            $table->dropColumn(['part_no', 'item_code']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['item_no']);
            $table->renameColumn('item_no', 'sku');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unique('sku');
        });
    }
};
