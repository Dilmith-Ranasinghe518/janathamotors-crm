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
 * Put every product in one store location (e.g. JMS-02).
 *  - Sets each product's Store Location.
 *  - Moves stock held at other stores (or at no store) into it, as transfer entries in the stock
 *    ledger, so history is kept and each product's total stock stays the same.
 * --dry-run shows what would change; --labels-only changes the location and leaves stock where it is.
 */
Artisan::command('products:move-to-store {code} {--dry-run} {--labels-only} {--force}', function () {
    $store = \App\Models\Store::where('code', $this->argument('code'))->first();
    if (! $store) {
        $this->error('No store with code '.$this->argument('code').'. Stores: '.\App\Models\Store::pluck('code')->join(', '));

        return 1;
    }

    $relabel = \App\Models\Product::where(fn ($q) => $q->whereNull('store_id')->orWhere('store_id', '<>', $store->id))->count();
    $balances = \App\Models\StockLedger::query()
        ->where(fn ($q) => $q->whereNull('store_id')->orWhere('store_id', '<>', $store->id))
        ->groupBy('product_id', 'store_id')
        ->havingRaw('SUM(quantity) <> 0')
        ->selectRaw('product_id, store_id, SUM(quantity) as qty')
        ->get();
    $moveStock = ! $this->option('labels-only');

    $this->info("Target: {$store->code} ({$store->name})");
    $this->line("Products whose Store Location changes: {$relabel}");
    $this->line($moveStock
        ? "Stock balances moved into {$store->code}: {$balances->count()} (".$balances->sum('qty').' units in total)'
        : 'Stock is left where it is (--labels-only).');

    if ($this->option('dry-run')) {
        $this->comment('Dry run: nothing was changed.');

        return 0;
    }
    if (! $this->option('force') && ! $this->confirm('Apply these changes?')) {
        $this->comment('Cancelled.');

        return 0;
    }

    $codes = \App\Models\Store::pluck('code', 'id');
    \Illuminate\Support\Facades\DB::transaction(function () use ($store, $balances, $moveStock, $codes) {
        \App\Models\Product::query()->update(['store_id' => $store->id]);

        if (! $moveStock) {
            return;
        }
        foreach ($balances as $b) {
            $from = $b->store_id ? ($codes[$b->store_id] ?? "Store #{$b->store_id}") : 'no store';
            $qty = (int) $b->qty;
            \App\Models\StockLedger::create([
                'product_id' => $b->product_id, 'store_id' => $b->store_id, 'type' => 'transfer_out',
                'quantity' => -$qty, 'note' => "Moved to {$store->code} (all products set to {$store->code})",
            ]);
            \App\Models\StockLedger::create([
                'product_id' => $b->product_id, 'store_id' => $store->id, 'type' => 'transfer_in',
                'quantity' => $qty, 'note' => "Moved from {$from} (all products set to {$store->code})",
            ]);
        }
    });

    $this->info("Done. All products are now in {$store->code}.");

    return 0;
})->purpose('Set every product to one store location and move its stock there');

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
