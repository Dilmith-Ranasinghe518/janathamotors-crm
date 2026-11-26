<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'manage_users',
            'manage_roles',
            'manage_settings',
            'view_dashboard',
            'view_reports',
            'manage_products',
            'manage_stock',
            'manage_suppliers',
            'create_invoice',
            'void_invoice',
            'apply_discount_over_limit',
            'manage_customers',
            'manage_stores',
            'manage_shipments',
            'manage_orders',
            'view_petty_cash',
            'request_petty_cash',
            'approve_petty_cash',
            'disburse_petty_cash',
            'manage_petty_cash',
            'find_parts',
            'create_stock_transfer',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

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

        $manager = Role::firstOrCreate(['name' => 'Manager', 'guard_name' => 'web']);
        $manager->syncPermissions([
            'view_dashboard',
            'view_reports',
            'manage_products',
            'manage_stock',
            'manage_suppliers',
            'create_invoice',
            'void_invoice',
            'apply_discount_over_limit',
            'manage_customers',
            'manage_stores',
            'manage_shipments',
            'manage_orders',
            'view_petty_cash',
            'request_petty_cash',
        ]);

        $cashier = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);
        // Cashier: Invoices, WhatsApp Orders, Inventory, Brands & Vehicles, Stock Transfers, Petty Cash.
        $cashier->syncPermissions([
            'create_invoice',
            'manage_orders',
            'manage_products',
            'manage_stock',
            'view_petty_cash',
            'request_petty_cash',
        ]);

        $inventoryClerk = Role::firstOrCreate(['name' => 'Inventory Clerk', 'guard_name' => 'web']);
        $inventoryClerk->syncPermissions([
            'view_dashboard',
            'view_reports',
            'manage_products',
            'manage_stock',
            'manage_suppliers',
            'manage_stores',
            'manage_shipments',
            'view_petty_cash',
            'request_petty_cash',
        ]);

        // Staff: own dashboard with the Parts Finder and stock transfers, plus petty cash requests.
        $staff = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staff->syncPermissions([
            'view_petty_cash',
            'request_petty_cash',
            'find_parts',
            'create_stock_transfer',
        ]);
    }
}
