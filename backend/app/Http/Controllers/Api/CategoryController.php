<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::with('parent')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
        ]);

        return response()->json(Category::create($data), 201);
    }

    public function show(Category $category)
    {
        return $category->load('parent', 'children');
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
        ]);

        $category->update($data);

        return $category;
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(null, 204);
    }
}
