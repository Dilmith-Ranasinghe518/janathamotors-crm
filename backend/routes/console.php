<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Restart invoice numbering at 1 (e.g. JMINV/2026/00001). Refuses while any invoice exists,
 * because reused numbers would clash with them.
 */
Artisan::command('invoices:reset-numbering', function () {
    $count = \App\Models\Invoice::count();
    if ($count > 0) {
        $this->error("There are still {$count} invoice(s). Delete them first; numbering was not reset.");

        return 1;
    }

    \App\Models\Setting::set('last_invoice_no', '0');
    \Illuminate\Support\Facades\DB::statement('ALTER TABLE invoices AUTO_INCREMENT = 1');

    $prefix = \App\Models\Setting::get('invoice_prefix', 'INV-');
    $this->info('Invoice numbering reset. The next invoice will be '.$prefix.'00001.');

    return 0;
})->purpose('Restart invoice numbering at 1 when there are no invoices');

/*
 * Activity-log retention: entries older than --days (default 365) are deleted.
 */
Artisan::command('activity-log:prune {--days=365}', function () {
    $days = max((int) $this->option('days'), 30);
    $deleted = \App\Models\AuditLog::where('created_at', '<', now()->subDays($days))->delete();
    $this->info("Deleted {$deleted} activity-log entr".($deleted === 1 ? 'y' : 'ies')." older than {$days} days.");
})->purpose('Delete activity-log entries older than the retention period');

// Needs the server cron: * * * * * php /path/to/backend/artisan schedule:run
\Illuminate\Support\Facades\Schedule::command('sanctum:prune-expired --hours=24')->daily();
\Illuminate\Support\Facades\Schedule::command('activity-log:prune')->daily();
