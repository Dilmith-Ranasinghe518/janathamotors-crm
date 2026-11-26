<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $pettyCashPermissions = [
            'view_dashboard',
            'view_reports',
            'view_petty_cash',
            'request_petty_cash',
            'approve_petty_cash',
            'disburse_petty_cash',
            'manage_petty_cash',
            'create_invoice',
            'manage_customers',
            'manage_suppliers',
        ];

        foreach ($pettyCashPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // 1. Admin gets all permissions
        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->syncPermissions(Permission::all());
        }

        // 2. Finance Admin role
        $financeAdmin = Role::firstOrCreate(['name' => 'Finance Admin', 'guard_name' => 'web']);
        $financeAdmin->syncPermissions([
            'view_dashboard',
            'view_reports',
            'view_petty_cash',
            'request_petty_cash',
            'approve_petty_cash',
            'disburse_petty_cash',
            'manage_petty_cash',
            'create_invoice',
            'manage_customers',
            'manage_suppliers',
        ]);

        // 3. Manager
        $manager = Role::where('name', 'Manager')->first();
        if ($manager) {
            $manager->givePermissionTo(['view_petty_cash', 'request_petty_cash']);
        }

        // 4. Cashier
        $cashier = Role::where('name', 'Cashier')->first();
        if ($cashier) {
            $cashier->givePermissionTo(['view_petty_cash', 'request_petty_cash']);
        }

        // 5. Inventory Clerk
        $inventoryClerk = Role::where('name', 'Inventory Clerk')->first();
        if ($inventoryClerk) {
            $inventoryClerk->givePermissionTo(['view_petty_cash', 'request_petty_cash']);
        }

        // 6. General Staff role
        $staff = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staff->syncPermissions([
            'view_petty_cash',
            'request_petty_cash',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
