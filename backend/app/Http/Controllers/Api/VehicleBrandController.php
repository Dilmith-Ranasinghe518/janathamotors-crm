<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleBrand;
use Illuminate\Http\Request;

class VehicleBrandController extends Controller
{
    public function index()
    {
        return VehicleBrand::withCount('vehicleModels')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:vehicle_brands,name'],
        ]);

        return response()->json(VehicleBrand::create($data), 201);
    }

    public function show(VehicleBrand $vehicleBrand)
    {
        return $vehicleBrand->load('vehicleModels');
    }

    public function update(Request $request, VehicleBrand $vehicleBrand)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:vehicle_brands,name,' . $vehicleBrand->id],
        ]);

        $vehicleBrand->update($data);

        return $vehicleBrand;
    }

    public function destroy(VehicleBrand $vehicleBrand)
    {
        $vehicleBrand->delete();

        return response()->json(null, 204);
    }
}
