<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;

// Catch-all route to serve the React SPA for all non-API and non-system routes
Route::get('/{any?}', function () {
    $spaIndexPath = public_path('index.html');

    if (File::exists($spaIndexPath)) {
        return Response::file($spaIndexPath, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    return response()->json([
        'status' => 'online',
        'app' => config('app.name'),
        'message' => 'Janatha Motors API is online. Build the React frontend into backend/public/ to view the CRM.',
    ], 200);
})->where('any', '^(?!api|up|sanctum|storage).*$');

