<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Cashier: Invoices, WhatsApp Orders, Inventory, Brands & Vehicles, Stock Transfers (and
     * Settings, which every user has for their own password). No Dashboard or Customers.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::where('name', 'Cashier')->first()?->syncPermissions([
            'create_invoice',
            'manage_orders',
            'manage_products',
            'manage_stock',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::where('name', 'Cashier')->first()?->syncPermissions([
            'view_dashboard',
            'create_invoice',
            'manage_customers',
            'manage_orders',
        ]);
    }
};
