<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockTransferController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleBrandController;
use App\Http\Controllers\Api\VehicleModelController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('permission:view_dashboard');

    Route::apiResource('categories', CategoryController::class)->middleware('permission:manage_products');
    Route::apiResource('brands', BrandController::class)->middleware('permission:manage_products');
    Route::get('/vehicle-brands', [VehicleBrandController::class, 'index']);
    Route::get('/vehicle-models', [VehicleModelController::class, 'index']);
    Route::apiResource('vehicle-brands', VehicleBrandController::class)->except(['index'])->middleware('permission:manage_products');
    Route::apiResource('vehicle-models', VehicleModelController::class)->except(['index'])->middleware('permission:manage_products');
    Route::apiResource('products', ProductController::class)->middleware('permission:manage_products');
    Route::post('/products/{product}/adjust-stock', [StockController::class, 'adjust'])->middleware('permission:manage_stock');
    Route::get('/stock-ledger', [StockController::class, 'index'])->middleware('permission:manage_stock');
    Route::apiResource('stock-transfers', StockTransferController::class)->only(['index', 'store', 'show'])->middleware('permission:manage_stock');

    Route::apiResource('suppliers', SupplierController::class)->middleware('permission:manage_suppliers');
    Route::apiResource('purchases', PurchaseController::class)->only(['index', 'store', 'show'])->middleware('permission:manage_suppliers');

    Route::apiResource('customers', CustomerController::class)->middleware('permission:manage_customers');
    Route::apiResource('stores', StoreController::class)->middleware('permission:manage_stores');

    Route::apiResource('invoices', InvoiceController::class)->only(['index', 'store', 'show', 'update'])->middleware('permission:create_invoice');
    Route::post('/invoices/{invoice}/void', [InvoiceController::class, 'void'])->middleware('permission:void_invoice');
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->middleware('permission:create_invoice');
    Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store'])->middleware('permission:create_invoice');

    Route::apiResource('users', UserController::class)->middleware('permission:manage_users');
    Route::apiResource('roles', RoleController::class)->middleware('permission:manage_roles');
    Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('permission:manage_roles');

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update'])->middleware('permission:manage_settings');
});
