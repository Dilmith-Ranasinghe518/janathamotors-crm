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
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

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
        ]);

        $cashier = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);
        $cashier->syncPermissions([
            'view_dashboard',
            'create_invoice',
            'manage_customers',
        ]);

        $inventoryClerk = Role::firstOrCreate(['name' => 'Inventory Clerk', 'guard_name' => 'web']);
        $inventoryClerk->syncPermissions([
            'view_dashboard',
            'view_reports',
            'manage_products',
            'manage_stock',
            'manage_suppliers',
            'manage_stores',
        ]);
    }
}
