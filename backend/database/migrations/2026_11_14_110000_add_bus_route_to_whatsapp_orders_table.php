<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parcels sent by bus are traced by route and bus (number, driver / conductor), not a tracking number.
     */
    public function up(): void
    {
        Schema::table('whatsapp_orders', function (Blueprint $table) {
            $table->string('bus_route')->nullable()->after('driver_mobile');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_orders', function (Blueprint $table) {
            $table->dropColumn('bus_route');
        });
    }
};
