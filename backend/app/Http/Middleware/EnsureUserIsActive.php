<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A deactivated account is signed out on its very next request, even with a login token
 * issued before it was deactivated.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only an explicit "inactive" counts; an unset value (new account, column default = active) does not.
        if ($user && $user->is_active !== null && ! (bool) $user->is_active) {
            $user->tokens()->delete();

            return response()->json(['message' => 'This account has been deactivated.'], 401);
        }

        return $next($request);
    }
}
