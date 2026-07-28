<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return Role::with('permissions:id,name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($role->load('permissions:id,name'), 201);
    }

    public function show(string $id)
    {
        return Role::with('permissions:id,name')->findOrFail($id);
    }

    public function update(Request $request, string $id)
    {
        $role = Role::findOrFail($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name,'.$role->id],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        return $role->load('permissions:id,name');
    }

    public function destroy(string $id)
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, ['Admin'], true)) {
            return response()->json(['message' => 'The Admin role cannot be deleted.'], 422);
        }

        $role->delete();

        return response()->json(null, 204);
    }

    public function permissions()
    {
        return Permission::orderBy('name')->get(['id', 'name']);
    }
}
