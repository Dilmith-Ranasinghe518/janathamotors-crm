<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $isMaintenance = Setting::get('maintenance_mode') === 'true' || Setting::get('maintenance_mode') === '1';

        if ($isMaintenance) {
            $user = $request->user();

            // If user is authenticated but does NOT have Admin role
            if ($user && ! $user->hasRole('Admin')) {
                // Immediately terminate their access token
                $user->currentAccessToken()?->delete();

                $message = Setting::get('maintenance_message')
                    ?: 'System is currently under maintenance. Only administrators can access the system at this time.';

                return response()->json([
                    'message' => $message,
                    'maintenance_mode' => true,
                ], 503);
            }
        }

        return $next($request);
    }
}
