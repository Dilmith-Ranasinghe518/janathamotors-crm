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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('shipment_no')->nullable()->unique();
            $table->string('title');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('carrier')->nullable();
            $table->string('tracking_no')->nullable()->index();
            $table->string('origin')->nullable();
            $table->string('status')->default('ordered')->index();
            $table->date('order_date')->nullable();
            $table->date('shipped_date')->nullable();
            $table->date('eta')->nullable();
            $table->date('arrived_date')->nullable();
            $table->unsignedInteger('packages')->nullable();
            $table->decimal('freight_cost', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
