<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Records every change made through the API (create / update / delete and actions such as void,
 * payments, imports), sign-ins (including failed ones), sign-outs and PDF / CSV downloads, with the
 * user, IP address and browser. Plain page views (other GET requests) are not recorded.
 *
 * A controller can add detail to its entry with
 * $request->attributes->set('activity', ['action' => ..., 'changes' => [...]]).
 */
class LogActivity
{
    private const RESOURCES = [
        'invoices' => 'invoice', 'products' => 'product', 'customers' => 'customer', 'suppliers' => 'supplier',
        'purchases' => 'purchase', 'stores' => 'store', 'stock-transfers' => 'stock transfer',
        'shipments' => 'shipment', 'whatsapp-orders' => 'WhatsApp order', 'categories' => 'category',
        'brands' => 'brand', 'vehicle-brands' => 'vehicle brand', 'vehicle-models' => 'vehicle model',
        'users' => 'user', 'roles' => 'role', 'settings' => 'settings', 'user' => 'own account',
    ];

    /** Sub-actions on a record, e.g. POST /invoices/5/void. */
    private const ACTIONS = [
        'void' => 'Voided', 'payments' => 'Recorded payment on', 'adjust-stock' => 'Adjusted stock of',
        'move' => 'Moved', 'status' => 'Changed status of', 'import' => 'Imported', 'flush' => 'Flushed',
        'maintenance' => 'Toggled maintenance mode in', 'password' => 'Changed password of',
        'pdf' => 'Downloaded PDF of', 'delivery-note' => 'Printed delivery note for', 'export' => 'Exported', 'template' => 'Downloaded import template of',
    ];

    private const HIDDEN_INPUT = ['password', 'password_confirmation', 'current_password', 'token'];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        try {
            if (! $this->shouldLog($request, $response)) {
                return;
            }
            $this->record($request, $response);
        } catch (Throwable $e) {
            report($e); // logging must never break a request
        }
    }

    private function shouldLog(Request $request, Response $response): bool
    {
        $path = Str::after($request->path(), 'api/');
        if ($path === 'login') {
            return true; // success and failure
        }
        if ($response->getStatusCode() >= 400) {
            return false;
        }
        if ($request->isMethod('GET')) {
            return (bool) preg_match('~/(pdf|delivery-note|export|template)$~', $path);
        }

        return true;
    }

    private function record(Request $request, Response $response): void
    {
        $path = Str::after($request->path(), 'api/');
        $status = $response->getStatusCode();
        $extra = $request->attributes->get('activity', []);
        [$action, $description, $model] = $path === 'login'
            ? $this->describeLogin($request, $status)
            : $this->describe($request, $response, $path);

        $user = $request->user() ?? ($path === 'login' && $status < 400 ? User::where('email', $request->input('email'))->first() : null);

        AuditLog::create([
            'user_id' => $user?->id,
            'action' => $extra['action'] ?? $action,
            'description' => $description,
            'model_type' => $model ? $model::class : null,
            'model_id' => $model?->getKey(),
            'changes' => array_filter([
                'input' => $this->input($request) ?: null,
                'details' => $extra['changes'] ?? null,
            ]) ?: null,
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'status' => $status,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);
    }

    private function describeLogin(Request $request, int $status): array
    {
        return $status < 400
            ? ['auth.login', 'Signed in', null]
            : ['auth.login_failed', 'Failed sign-in attempt for '.Str::limit((string) $request->input('email'), 100), null];
    }

    private function describe(Request $request, Response $response, string $path): array
    {
        if ($path === 'logout') {
            return ['auth.logout', 'Signed out', null];
        }

        $segments = explode('/', $path);
        $resourceKey = $segments[0];
        $resource = self::RESOURCES[$resourceKey] ?? str_replace('-', ' ', $resourceKey);
        $sub = count($segments) > 1 ? end($segments) : null;
        $sub = $sub !== null && isset(self::ACTIONS[$sub]) ? $sub : null;

        $model = collect($request->route()?->parameters() ?? [])->first(fn ($p) => $p instanceof Model);
        $subject = $this->subject($model) ?? $this->subject($this->responseBody($response));

        $verb = $sub ? self::ACTIONS[$sub] : match ($request->method()) {
            'POST' => 'Created',
            'PUT', 'PATCH' => 'Updated',
            'DELETE' => 'Deleted',
            default => 'Opened',
        };
        $action = Str::slug($resource, '_').'.'.($sub ? Str::slug($sub, '_') : strtolower(match ($request->method()) {
            'POST' => 'create', 'PUT', 'PATCH' => 'update', 'DELETE' => 'delete', default => 'view',
        }));

        return [$action, trim("{$verb} {$resource}".($subject ? " {$subject}" : '')), $model];
    }

    /** A recognisable name for a record: its number, code or name. */
    private function subject(mixed $record): ?string
    {
        if ($record instanceof Model) {
            $record = $record->getAttributes();
        }
        if (! is_array($record)) {
            return null;
        }
        foreach (['invoice_no', 'order_no', 'shipment_no', 'transfer_no', 'reference_no', 'item_code', 'name', 'code'] as $key) {
            if (! empty($record[$key]) && is_scalar($record[$key])) {
                return (string) $record[$key];
            }
        }

        return isset($record['id']) ? '#'.$record['id'] : null;
    }

    private function responseBody(Response $response): ?array
    {
        $type = (string) $response->headers->get('Content-Type');
        if (! str_contains($type, 'json')) {
            return null;
        }
        $data = json_decode((string) $response->getContent(), true);

        return is_array($data) ? $data : null;
    }

    /** What was submitted, minus passwords and files, kept small. */
    private function input(Request $request): array
    {
        $input = collect($request->except(self::HIDDEN_INPUT))->map(function ($value) {
            if (is_object($value)) {
                return '[file]';
            }

            return $value;
        })->all();

        foreach ($request->allFiles() as $key => $file) {
            $input[$key] = '[file] '.(is_array($file) ? count($file).' files' : $file->getClientOriginalName());
        }

        $json = json_encode($input);

        return strlen((string) $json) > 4000 ? ['_truncated' => Str::limit((string) $json, 4000)] : $input;
    }
}
