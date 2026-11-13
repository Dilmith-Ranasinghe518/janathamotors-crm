<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index()
    {
        return User::with('roles:id,name')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults()],
            'role' => ['required', 'exists:roles,name'],
        ]);
        $this->guardAdminRole($request, $data['role']);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => true,
        ]);

        $user->assignRole($data['role']);

        return response()->json($user->load('roles:id,name'), 201);
    }

    public function show(User $user)
    {
        return $user->load('roles:id,name');
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', Password::defaults()],
            'role' => ['required', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);
        // Making someone an Admin, or changing an existing Admin, is for Admins only.
        $this->guardAdminRole($request, $data['role']);
        if ($user->hasRole('Admin')) {
            $this->guardAdminRole($request, 'Admin');
        }
        if ($user->id === $request->user()->id && ($data['is_active'] ?? true) === false) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }
        $wasActive = $user->is_active;

        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'is_active' => $data['is_active'] ?? $user->is_active,
        ]);

        $passwordChanged = ! empty($data['password']);
        if ($passwordChanged) {
            $user->password = $data['password'];
        }

        $user->save();
        $user->syncRoles([$data['role']]);

        // Deactivating an account or resetting its password signs it out everywhere.
        if (($wasActive && ! $user->is_active) || $passwordChanged) {
            $user->tokens()->delete();
        }

        return $user->load('roles:id,name');
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->hasRole('Admin')) {
            $this->guardAdminRole($request, 'Admin');
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(null, 204);
    }

    private function guardAdminRole(Request $request, string $role): void
    {
        if ($role === 'Admin' && ! $request->user()->hasRole('Admin')) {
            abort(403, 'Only administrators can assign or change the Admin role.');
        }
    }
}
