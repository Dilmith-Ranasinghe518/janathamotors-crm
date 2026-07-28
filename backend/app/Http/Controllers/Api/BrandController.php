<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index()
    {
        return Brand::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255', 'unique:brands,name']]);

        return response()->json(Brand::create($data), 201);
    }

    public function show(Brand $brand)
    {
        return $brand;
    }

    public function update(Request $request, Brand $brand)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:brands,name,'.$brand->id],
        ]);

        $brand->update($data);

        return $brand;
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();

        return response()->json(null, 204);
    }
}
