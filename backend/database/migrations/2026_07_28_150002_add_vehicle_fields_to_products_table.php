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
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('vehicle_brand_id')->nullable()->after('brand_id')->constrained('vehicle_brands')->nullOnDelete();
            $table->foreignId('vehicle_model_id')->nullable()->after('vehicle_brand_id')->constrained('vehicle_models')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['vehicle_model_id']);
            $table->dropForeign(['vehicle_brand_id']);
            $table->dropColumn(['vehicle_model_id', 'vehicle_brand_id']);
        });
    }
};
