<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/*
 * Staff dashboard: find_parts (look up parts / Parts Finder) and create_stock_transfer
 * (make and view stock transfers and their POs, without stock adjustments or the ledger).
 * Given to Admin and Staff; other roles can get them from Roles & Permissions.
 */
return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (['find_parts', 'create_stock_transfer'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        Role::where('name', 'Admin')->first()?->givePermissionTo(['find_parts', 'create_stock_transfer']);
        Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web'])->givePermissionTo(['find_parts', 'create_stock_transfer']);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::whereIn('name', ['find_parts', 'create_stock_transfer'])->delete();
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
