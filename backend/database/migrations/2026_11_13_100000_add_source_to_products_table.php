<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Products typed straight onto an invoice (not found in inventory) are marked "invoice"
     * and linked to the invoice that created them, so they can be completed later.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('source')->nullable()->index()->after('is_active');
            $table->unsignedBigInteger('source_invoice_id')->nullable()->after('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn(['source', 'source_invoice_id']);
        });
    }
};
