<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockTransferController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleBrandController;
use App\Http\Controllers\Api\VehicleModelController;
use App\Http\Controllers\Api\WhatsappOrderController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/maintenance-status', [SettingController::class, 'publicStatus']);

Route::middleware(['auth:sanctum', 'active', 'maintenance', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('permission:view_dashboard');
    Route::get('/reports/{type}', [ReportController::class, 'show'])->middleware('permission:view_reports');

    Route::apiResource('categories', CategoryController::class)->middleware('permission:manage_products');
    Route::apiResource('brands', BrandController::class)->middleware('permission:manage_products');
    Route::get('/vehicle-brands', [VehicleBrandController::class, 'index']);
    Route::get('/vehicle-models', [VehicleModelController::class, 'index']);
    Route::apiResource('vehicle-brands', VehicleBrandController::class)->except(['index'])->middleware('permission:manage_products');
    Route::apiResource('vehicle-models', VehicleModelController::class)->except(['index'])->middleware('permission:manage_products');
    Route::get('/products/export', [ProductController::class, 'export'])->middleware('permission:manage_products');
    Route::get('/products/template', [ProductController::class, 'template'])->middleware('permission:manage_products');
    Route::post('/products/import', [ProductController::class, 'import'])->middleware('permission:manage_products');
    Route::post('/products/flush', [ProductController::class, 'flush'])->middleware('role:Admin');
    // Looking products up is also needed for billing (item search) and the Parts Finder; changing them is not.
    Route::get('/products', [ProductController::class, 'index'])->middleware('permission:manage_products|create_invoice');
    Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:manage_products|create_invoice');
    Route::apiResource('products', ProductController::class)->except(['index', 'show'])->middleware('permission:manage_products');
    Route::post('/products/{product}/adjust-stock', [StockController::class, 'adjust'])->middleware('permission:manage_stock');
    Route::get('/stock-ledger', [StockController::class, 'index'])->middleware('permission:manage_stock');
    Route::apiResource('stock-transfers', StockTransferController::class)->only(['index', 'store', 'show'])->middleware('permission:manage_stock');

    Route::patch('/shipments/{shipment}/move', [ShipmentController::class, 'move'])->middleware('permission:manage_shipments');
    Route::apiResource('shipments', ShipmentController::class)->middleware('permission:manage_shipments');

    Route::middleware('permission:manage_orders')->group(function () {
        Route::get('/whatsapp-orders/invoices', [WhatsappOrderController::class, 'invoices']);
        Route::patch('/whatsapp-orders/{whatsappOrder}/status', [WhatsappOrderController::class, 'updateStatus']);
        Route::apiResource('whatsapp-orders', WhatsappOrderController::class);
    });

    Route::apiResource('suppliers', SupplierController::class)->middleware('permission:manage_suppliers');
    Route::apiResource('purchases', PurchaseController::class)->only(['index', 'store', 'show'])->middleware('permission:manage_suppliers');

    // Reading the customer / store lists is also needed by pages that are not the Customers or
    // Stores page (billing, inventory, transfers, shipments, reports); changing them is not.
    Route::get('/customers', [CustomerController::class, 'index'])->middleware('permission:manage_customers|create_invoice');
    Route::apiResource('customers', CustomerController::class)->except(['index'])->middleware('permission:manage_customers');
    Route::get('/stores', [StoreController::class, 'index'])
        ->middleware('permission:manage_stores|manage_products|manage_stock|create_invoice|manage_shipments|view_reports');
    Route::apiResource('stores', StoreController::class)->except(['index'])->middleware('permission:manage_stores');

    Route::apiResource('invoices', InvoiceController::class)->only(['index', 'store', 'show', 'update'])->middleware('permission:create_invoice');
    Route::post('/invoices/{invoice}/void', [InvoiceController::class, 'void'])->middleware('permission:void_invoice');
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('role:Admin');
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->middleware('permission:create_invoice');
    Route::get('/invoices/{invoice}/delivery-note', [InvoiceController::class, 'deliveryNote'])->middleware('permission:create_invoice');
    Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store'])->middleware('permission:create_invoice');

    Route::apiResource('users', UserController::class)->middleware('permission:manage_users');
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('role:Admin');
    Route::apiResource('roles', RoleController::class)->middleware('permission:manage_roles');
    Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('permission:manage_roles');

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update'])->middleware('permission:manage_settings');
    Route::post('/settings/maintenance', [SettingController::class, 'toggleMaintenance'])->middleware('permission:manage_settings');
});
