<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Selling prices are VAT-inclusive: each invoice records the rate it was raised at and the
     * VAT contained in its total, plus the purchaser details a tax invoice needs.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('vat_rate', 5, 2)->default(0)->after('tax');
            $table->decimal('vat_amount', 12, 2)->default(0)->after('vat_rate');
            $table->string('customer_tin')->nullable()->after('customer_phone');
            $table->text('customer_address')->nullable()->after('customer_tin');
            $table->date('delivery_date')->nullable()->after('vehicle_year');
            $table->string('place_of_supply')->nullable()->after('delivery_date');
            $table->string('payment_mode')->nullable()->after('place_of_supply');
            $table->text('additional_info')->nullable()->after('payment_mode');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->string('tin')->nullable()->after('phone');
        });

        // Older invoices added tax on top of the price; carry that tax over as their VAT.
        DB::table('invoices')->where('tax', '>', 0)->update([
            'vat_amount' => DB::raw('tax'),
            'vat_rate' => DB::raw('ROUND(tax / NULLIF(total - tax, 0) * 100, 2)'),
        ]);

        // Business details for the bills — prefilled from what was printed before; edit in Settings.
        $defaults = [
            'company_legal_name' => 'Janatha Motors (Pvt) Ltd',
            'company_address' => 'No 225, 25 Mohideen Masjid Rd, Colombo 01000',
            'company_phone' => '071 319 0234',
            'company_whatsapp' => '076 132 1950',
            'company_email' => 'janathamotors@gmail.com',
            'company_website' => null,
            'company_branches' => null,
            'vat_reg_no' => null,
            'business_reg_no' => null,
            'invoice_footer_note' => "All spare parts carry standard manufacturer warranty.\nPlease retain this invoice for any warranty claims.",
        ];
        foreach ($defaults as $key => $value) {
            if (! DB::table('settings')->where('key', $key)->exists()) {
                DB::table('settings')->insert(['key' => $key, 'value' => $value, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['vat_rate', 'vat_amount', 'customer_tin', 'customer_address', 'delivery_date', 'place_of_supply', 'payment_mode', 'additional_info']);
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('tin');
        });
    }
};
