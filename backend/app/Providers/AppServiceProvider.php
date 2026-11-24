<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Activity log: note every record created / updated / deleted during a request, field by field.
        $this->app->scoped(\App\Support\ActivityRecorder::class);
        foreach (['created', 'updated', 'deleted'] as $event) {
            \Illuminate\Support\Facades\Event::listen("eloquent.{$event}: *", function (string $name, array $data) use ($event) {
                if (($data[0] ?? null) instanceof \Illuminate\Database\Eloquent\Model) {
                    app(\App\Support\ActivityRecorder::class)->{$event}($data[0]);
                }
            });
        }

        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('Admin') ? true : null;
        });

        // Sign-in: 5 tries a minute per account + IP, and 20 a minute per IP across accounts.
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip())->response(fn () => response()->json([
                    'message' => 'Too many sign-in attempts. Please wait a minute and try again.',
                ], 429)),
                Limit::perMinute(20)->by('ip:'.$request->ip())->response(fn () => response()->json([
                    'message' => 'Too many sign-in attempts from this network. Please wait a minute and try again.',
                ], 429)),
            ];
        });

        // Everything else: generous per-user ceiling against runaway scripts / abuse.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->id ?: $request->ip()));

        // Passwords: at least 8 characters with letters and numbers.
        Password::defaults(fn () => Password::min(8)->letters()->numbers());
    }
}
