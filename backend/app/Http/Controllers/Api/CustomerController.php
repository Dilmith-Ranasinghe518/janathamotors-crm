<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        return Customer::query()
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%')
                ->orWhere('phone', 'like', '%'.$request->string('search').'%'))
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
            'vehicle_no' => ['nullable', 'string', 'max:50'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
        ]);

        $data['current_due'] = $data['opening_balance'] ?? 0;

        return response()->json(Customer::create($data), 201);
    }

    public function show(Customer $customer)
    {
        return $customer->load(['invoices' => fn ($q) => $q->latest()->limit(20)]);
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'vehicle_no' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ]);

        $customer->update($data);

        return $customer;
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json(null, 204);
    }
}
