<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A unique reference the app gives each bill it saves (e.g. offline bills), so a bill sent
     * twice — a retry after a dropped connection — is only ever created once.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('client_ref', 64)->nullable()->unique()->after('invoice_no');
            $table->boolean('created_offline')->default(false)->after('is_credit');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['client_ref']);
            $table->dropColumn(['client_ref', 'created_offline']);
        });
    }
};
