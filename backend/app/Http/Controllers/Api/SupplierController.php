<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        return Supplier::query()
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->orderBy('name')
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        return response()->json(Supplier::create($data), 201);
    }

    public function show(Supplier $supplier)
    {
        return $supplier->load('purchases');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $supplier->update($data);

        return $supplier;
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return response()->json(null, 204);
    }
}
