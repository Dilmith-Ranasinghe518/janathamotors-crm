<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleModel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehicleModelController extends Controller
{
    public function index(Request $request)
    {
        $query = VehicleModel::with('vehicleBrand')->orderBy('name');

        if ($request->has('vehicle_brand_id')) {
            $query->where('vehicle_brand_id', $request->vehicle_brand_id);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vehicle_brand_id' => ['required', 'exists:vehicle_brands,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('vehicle_models')->where(fn ($query) => $query->where('vehicle_brand_id', $request->vehicle_brand_id)),
            ],
        ]);

        $model = VehicleModel::create($data);

        return response()->json($model->load('vehicleBrand'), 201);
    }

    public function show(VehicleModel $vehicleModel)
    {
        return $vehicleModel->load('vehicleBrand');
    }

    public function update(Request $request, VehicleModel $vehicleModel)
    {
        $brandId = $request->input('vehicle_brand_id', $vehicleModel->vehicle_brand_id);

        $data = $request->validate([
            'vehicle_brand_id' => ['required', 'exists:vehicle_brands,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('vehicle_models')->where(fn ($query) => $query->where('vehicle_brand_id', $brandId))->ignore($vehicleModel->id),
            ],
        ]);

        $vehicleModel->update($data);

        return $vehicleModel->load('vehicleBrand');
    }

    public function destroy(VehicleModel $vehicleModel)
    {
        $vehicleModel->delete();

        return response()->json(null, 204);
    }
}
