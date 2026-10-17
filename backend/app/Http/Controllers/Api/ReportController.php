<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Every report returns the same shape so the frontend can render any of them generically:
 * { title, columns: [{key, label, type}], rows: [...], summary: [{label, value, type}], chart?: {...} }
 * Column / summary types: text | number | money | date.
 */
class ReportController extends Controller
{
    private const REPORTS = [
        'sales' => 'salesSummary',
        'product_sales' => 'productSales',
        'payments' => 'payments',
        'stock_valuation' => 'stockValuation',
        'low_stock' => 'lowStock',
        'stock_movements' => 'stockMovements',
        'customer_dues' => 'customerDues',
        'purchases' => 'purchases',
        'whatsapp_orders' => 'whatsappOrders',
    ];

    public function show(Request $request, string $type)
    {
        abort_unless(isset(self::REPORTS[$type]), 404, 'Unknown report.');

        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'store_id' => ['nullable', Rule::exists('stores', 'id')],
        ]);

        $from = Carbon::parse($filters['from'] ?? now()->startOfMonth())->startOfDay();
        $to = Carbon::parse($filters['to'] ?? now())->endOfDay();
        $storeId = $filters['store_id'] ?? null;

        $report = $this->{self::REPORTS[$type]}($from, $to, $storeId);
        $report['period'] = ['from' => $from->toDateString(), 'to' => $to->toDateString()];

        return response()->json($report);
    }

    private function salesSummary(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('invoices')
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$from, $to])
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at)')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as invoices, SUM(subtotal) as subtotal, SUM(discount) as discount, SUM(total) as total, SUM(paid_amount) as paid, SUM(due_amount) as due')
            ->get()
            ->map(fn ($r) => $this->numeric($r, ['invoices'], ['subtotal', 'discount', 'total', 'paid', 'due']));

        return [
            'title' => 'Sales Summary',
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
                ['key' => 'invoices', 'label' => 'Invoices', 'type' => 'number'],
                ['key' => 'subtotal', 'label' => 'Subtotal', 'type' => 'money'],
                ['key' => 'discount', 'label' => 'Discount', 'type' => 'money'],
                ['key' => 'total', 'label' => 'Total Sales', 'type' => 'money'],
                ['key' => 'paid', 'label' => 'Paid', 'type' => 'money'],
                ['key' => 'due', 'label' => 'Due', 'type' => 'money'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Total sales', 'value' => $rows->sum('total'), 'type' => 'money'],
                ['label' => 'Invoices', 'value' => $rows->sum('invoices'), 'type' => 'number'],
                ['label' => 'Collected', 'value' => $rows->sum('paid'), 'type' => 'money'],
                ['label' => 'Outstanding', 'value' => $rows->sum('due'), 'type' => 'money'],
            ],
            'chart' => ['type' => 'area', 'x' => 'date', 'y' => 'total', 'label' => 'Sales by day'],
        ];
    }

    private function productSales(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('invoice_items as ii')
            ->join('invoices as i', 'i.id', '=', 'ii.invoice_id')
            ->join('products as p', 'p.id', '=', 'ii.product_id')
            ->where('i.status', '!=', 'cancelled')
            ->whereBetween('i.created_at', [$from, $to])
            ->when($storeId, fn ($q) => $q->where('i.store_id', $storeId))
            ->groupBy('p.id', 'p.item_code', 'p.name', 'p.cost_price')
            ->selectRaw('p.item_code, p.name, SUM(ii.quantity) as quantity, SUM(ii.line_total) as revenue, SUM(ii.quantity) * p.cost_price as cost')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($r) {
                $r = $this->numeric($r, ['quantity'], ['revenue', 'cost']);
                $r->profit = round($r->revenue - $r->cost, 2);

                return $r;
            });

        return [
            'title' => 'Product Sales',
            'note' => 'Cost and profit use each product\'s current cost price.',
            'columns' => [
                ['key' => 'item_code', 'label' => 'Item Code', 'type' => 'text'],
                ['key' => 'name', 'label' => 'Item', 'type' => 'text'],
                ['key' => 'quantity', 'label' => 'Qty Sold', 'type' => 'number'],
                ['key' => 'revenue', 'label' => 'Revenue', 'type' => 'money'],
                ['key' => 'cost', 'label' => 'Cost', 'type' => 'money'],
                ['key' => 'profit', 'label' => 'Gross Profit', 'type' => 'money'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Revenue', 'value' => $rows->sum('revenue'), 'type' => 'money'],
                ['label' => 'Gross profit', 'value' => $rows->sum('profit'), 'type' => 'money'],
                ['label' => 'Units sold', 'value' => $rows->sum('quantity'), 'type' => 'number'],
                ['label' => 'Products sold', 'value' => $rows->count(), 'type' => 'number'],
            ],
            'chart' => ['type' => 'bar', 'x' => 'name', 'y' => 'revenue', 'label' => 'Top 10 products by revenue', 'limit' => 10],
        ];
    }

    private function payments(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('payments as pm')
            ->join('invoices as i', 'i.id', '=', 'pm.invoice_id')
            ->whereBetween('pm.paid_at', [$from, $to])
            ->when($storeId, fn ($q) => $q->where('i.store_id', $storeId))
            ->groupByRaw('DATE(pm.paid_at), pm.method')
            ->orderByRaw('DATE(pm.paid_at), pm.method')
            ->selectRaw('DATE(pm.paid_at) as date, pm.method, COUNT(*) as payments, SUM(pm.amount) as amount')
            ->get()
            ->map(function ($r) {
                $r = $this->numeric($r, ['payments'], ['amount']);
                $r->method = ucwords(str_replace('_', ' ', $r->method));

                return $r;
            });

        $summary = [['label' => 'Total collected', 'value' => $rows->sum('amount'), 'type' => 'money']];
        foreach ($rows->groupBy('method') as $method => $group) {
            $summary[] = ['label' => $method, 'value' => $group->sum('amount'), 'type' => 'money'];
        }

        return [
            'title' => 'Payments Collected',
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
                ['key' => 'method', 'label' => 'Method', 'type' => 'text'],
                ['key' => 'payments', 'label' => 'Payments', 'type' => 'number'],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'money'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => $summary,
        ];
    }

    private function stockValuation(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('stock_ledger as sl')
            ->join('products as p', 'p.id', '=', 'sl.product_id')
            ->leftJoin('stores as s', 's.id', '=', 'sl.store_id')
            ->when($storeId, fn ($q) => $q->where('sl.store_id', $storeId))
            ->groupBy('p.id', 's.id', 'p.item_code', 'p.name', 's.code', 'p.cost_price', 'p.selling_price')
            ->havingRaw('SUM(sl.quantity) <> 0')
            ->selectRaw('p.item_code, p.name, s.code as store, SUM(sl.quantity) as quantity, p.cost_price, p.selling_price')
            ->orderBy('p.name')
            ->get()
            ->map(function ($r) {
                $r = $this->numeric($r, ['quantity'], ['cost_price', 'selling_price']);
                $r->cost_value = round($r->quantity * $r->cost_price, 2);
                $r->retail_value = round($r->quantity * $r->selling_price, 2);

                return $r;
            });

        return [
            'title' => 'Stock Valuation',
            'note' => 'Current stock on hand (date range does not apply).',
            'columns' => [
                ['key' => 'item_code', 'label' => 'Item Code', 'type' => 'text'],
                ['key' => 'name', 'label' => 'Item', 'type' => 'text'],
                ['key' => 'store', 'label' => 'Store', 'type' => 'text'],
                ['key' => 'quantity', 'label' => 'Qty', 'type' => 'number'],
                ['key' => 'cost_price', 'label' => 'Unit Cost', 'type' => 'money', 'noTotal' => true],
                ['key' => 'cost_value', 'label' => 'Cost Value', 'type' => 'money'],
                ['key' => 'retail_value', 'label' => 'Retail Value', 'type' => 'money'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Stock at cost', 'value' => $rows->sum('cost_value'), 'type' => 'money'],
                ['label' => 'Stock at retail', 'value' => $rows->sum('retail_value'), 'type' => 'money'],
                ['label' => 'Units on hand', 'value' => $rows->sum('quantity'), 'type' => 'number'],
                ['label' => 'Line items', 'value' => $rows->count(), 'type' => 'number'],
            ],
        ];
    }

    private function lowStock(Carbon $from, Carbon $to, $storeId): array
    {
        $stockSql = '(select coalesce(sum(quantity), 0) from stock_ledger where stock_ledger.product_id = p.id'
            .($storeId ? ' and stock_ledger.store_id = '.(int) $storeId : '').')';

        $rows = DB::table('products as p')
            ->leftJoin('stores as s', 's.id', '=', 'p.store_id')
            ->where('p.is_active', true)
            ->whereRaw("{$stockSql} <= p.reorder_level")
            ->selectRaw("p.item_code, p.name, s.code as store, p.shelf_location, {$stockSql} as stock, p.reorder_level")
            ->orderByRaw("{$stockSql} - p.reorder_level")
            ->get()
            ->map(function ($r) {
                $r = $this->numeric($r, ['stock', 'reorder_level'], []);
                $r->shortfall = max($r->reorder_level - $r->stock, 0);

                return $r;
            });

        return [
            'title' => 'Low Stock',
            'note' => 'Products at or below their reorder level (date range does not apply).',
            'columns' => [
                ['key' => 'item_code', 'label' => 'Item Code', 'type' => 'text'],
                ['key' => 'name', 'label' => 'Item', 'type' => 'text'],
                ['key' => 'store', 'label' => 'Store', 'type' => 'text'],
                ['key' => 'shelf_location', 'label' => 'Location', 'type' => 'text'],
                ['key' => 'stock', 'label' => 'In Stock', 'type' => 'number'],
                ['key' => 'reorder_level', 'label' => 'Reorder Level', 'type' => 'number'],
                ['key' => 'shortfall', 'label' => 'Shortfall', 'type' => 'number'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Products low', 'value' => $rows->count(), 'type' => 'number'],
                ['label' => 'Out of stock', 'value' => $rows->where('stock', '<=', 0)->count(), 'type' => 'number'],
                ['label' => 'Units to reorder', 'value' => $rows->sum('shortfall'), 'type' => 'number'],
            ],
        ];
    }

    private function stockMovements(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('stock_ledger as sl')
            ->join('products as p', 'p.id', '=', 'sl.product_id')
            ->whereBetween('sl.created_at', [$from, $to])
            ->when($storeId, fn ($q) => $q->where('sl.store_id', $storeId))
            ->groupBy('p.id', 'p.item_code', 'p.name')
            ->selectRaw("p.item_code, p.name,
                SUM(CASE WHEN sl.type = 'purchase' THEN sl.quantity ELSE 0 END) as purchased,
                SUM(CASE WHEN sl.type = 'sale' THEN -sl.quantity ELSE 0 END) as sold,
                SUM(CASE WHEN sl.type = 'return' THEN sl.quantity ELSE 0 END) as returned,
                SUM(CASE WHEN sl.type = 'adjustment' THEN sl.quantity ELSE 0 END) as adjusted,
                SUM(sl.quantity) as net")
            ->orderBy('p.name')
            ->get()
            ->map(fn ($r) => $this->numeric($r, ['purchased', 'sold', 'returned', 'adjusted', 'net'], []));

        return [
            'title' => 'Stock Movements',
            'note' => 'Adjustments include stock transfers between stores.',
            'columns' => [
                ['key' => 'item_code', 'label' => 'Item Code', 'type' => 'text'],
                ['key' => 'name', 'label' => 'Item', 'type' => 'text'],
                ['key' => 'purchased', 'label' => 'Purchased', 'type' => 'number'],
                ['key' => 'sold', 'label' => 'Sold', 'type' => 'number'],
                ['key' => 'returned', 'label' => 'Returned', 'type' => 'number'],
                ['key' => 'adjusted', 'label' => 'Adjusted', 'type' => 'number'],
                ['key' => 'net', 'label' => 'Net Change', 'type' => 'number'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Units in', 'value' => $rows->sum('purchased') + $rows->sum('returned'), 'type' => 'number'],
                ['label' => 'Units sold', 'value' => $rows->sum('sold'), 'type' => 'number'],
                ['label' => 'Net change', 'value' => $rows->sum('net'), 'type' => 'number'],
            ],
        ];
    }

    private function customerDues(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('invoices as i')
            ->leftJoin('customers as c', 'c.id', '=', 'i.customer_id')
            ->where('i.status', '!=', 'cancelled')
            ->where('i.due_amount', '>', 0)
            ->whereBetween('i.created_at', [$from, $to])
            ->when($storeId, fn ($q) => $q->where('i.store_id', $storeId))
            ->selectRaw("i.invoice_no, DATE(i.created_at) as date, COALESCE(c.name, i.customer_name, 'Walk-in') as customer,
                COALESCE(c.phone, i.customer_phone) as phone, i.total, i.paid_amount as paid, i.due_amount as due,
                DATEDIFF(CURDATE(), i.created_at) as age_days")
            ->orderBy('i.created_at')
            ->get()
            ->map(fn ($r) => $this->numeric($r, ['age_days'], ['total', 'paid', 'due']));

        return [
            'title' => 'Customer Dues',
            'note' => 'Unpaid and partly paid invoices raised in the selected period.',
            'columns' => [
                ['key' => 'invoice_no', 'label' => 'Invoice', 'type' => 'text'],
                ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
                ['key' => 'customer', 'label' => 'Customer', 'type' => 'text'],
                ['key' => 'phone', 'label' => 'Phone', 'type' => 'text'],
                ['key' => 'total', 'label' => 'Total', 'type' => 'money'],
                ['key' => 'paid', 'label' => 'Paid', 'type' => 'money'],
                ['key' => 'due', 'label' => 'Due', 'type' => 'money'],
                ['key' => 'age_days', 'label' => 'Age (days)', 'type' => 'number', 'noTotal' => true],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Total outstanding', 'value' => $rows->sum('due'), 'type' => 'money'],
                ['label' => 'Invoices', 'value' => $rows->count(), 'type' => 'number'],
                ['label' => 'Over 30 days', 'value' => $rows->where('age_days', '>', 30)->sum('due'), 'type' => 'money'],
            ],
        ];
    }

    private function purchases(Carbon $from, Carbon $to, $storeId): array
    {
        $rows = DB::table('purchases as pu')
            ->leftJoin('suppliers as su', 'su.id', '=', 'pu.supplier_id')
            ->where('pu.status', '!=', 'cancelled')
            ->whereBetween('pu.purchased_at', [$from->toDateString(), $to->toDateString()])
            ->when($storeId, fn ($q) => $q->where('pu.store_id', $storeId))
            ->groupBy('su.id', 'su.name')
            ->selectRaw("COALESCE(su.name, 'Unknown supplier') as supplier, COUNT(*) as purchases, SUM(pu.total) as total, MAX(pu.purchased_at) as last_purchase")
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => $this->numeric($r, ['purchases'], ['total']));

        return [
            'title' => 'Purchases by Supplier',
            'columns' => [
                ['key' => 'supplier', 'label' => 'Supplier', 'type' => 'text'],
                ['key' => 'purchases', 'label' => 'Purchases', 'type' => 'number'],
                ['key' => 'total', 'label' => 'Total', 'type' => 'money'],
                ['key' => 'last_purchase', 'label' => 'Last Purchase', 'type' => 'date'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Total purchased', 'value' => $rows->sum('total'), 'type' => 'money'],
                ['label' => 'Purchases', 'value' => $rows->sum('purchases'), 'type' => 'number'],
                ['label' => 'Suppliers', 'value' => $rows->count(), 'type' => 'number'],
            ],
            'chart' => ['type' => 'bar', 'x' => 'supplier', 'y' => 'total', 'label' => 'Purchases by supplier', 'limit' => 10],
        ];
    }

    private function whatsappOrders(Carbon $from, Carbon $to, $storeId): array
    {
        $partners = ['pickme' => 'PickMe', 'uber' => 'Uber', 'dhl' => 'DHL', 'prompt_xp' => 'Prompt XP', 'pronto' => 'Pronto', 'domex' => 'Domex'];

        $rows = DB::table('whatsapp_orders as o')
            ->leftJoin('invoices as i', 'i.id', '=', 'o.invoice_id')
            ->whereBetween('o.order_date', [$from->toDateString(), $to->toDateString()])
            ->when($storeId, fn ($q) => $q->where('i.store_id', $storeId))
            ->groupBy('o.shipping_partner')
            ->selectRaw("o.shipping_partner as partner, COUNT(*) as orders,
                SUM(o.status = 'pending') as pending, SUM(o.status = 'confirmed') as confirmed,
                SUM(o.status = 'dispatched') as dispatched, SUM(o.status = 'delivered') as delivered,
                SUM(o.status = 'cancelled') as cancelled, COALESCE(SUM(i.total), 0) as invoice_value")
            ->orderByDesc('orders')
            ->get()
            ->map(function ($r) use ($partners) {
                $r = $this->numeric($r, ['orders', 'pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'], ['invoice_value']);
                $r->partner = $partners[$r->partner] ?? $r->partner;

                return $r;
            });

        return [
            'title' => 'WhatsApp Orders',
            'columns' => [
                ['key' => 'partner', 'label' => 'Shipping Partner', 'type' => 'text'],
                ['key' => 'orders', 'label' => 'Orders', 'type' => 'number'],
                ['key' => 'pending', 'label' => 'Pending', 'type' => 'number'],
                ['key' => 'confirmed', 'label' => 'Confirmed', 'type' => 'number'],
                ['key' => 'dispatched', 'label' => 'Dispatched', 'type' => 'number'],
                ['key' => 'delivered', 'label' => 'Delivered', 'type' => 'number'],
                ['key' => 'cancelled', 'label' => 'Cancelled', 'type' => 'number'],
                ['key' => 'invoice_value', 'label' => 'Invoice Value', 'type' => 'money'],
            ],
            'rows' => $rows,
            'totals' => true,
            'summary' => [
                ['label' => 'Orders', 'value' => $rows->sum('orders'), 'type' => 'number'],
                ['label' => 'Delivered', 'value' => $rows->sum('delivered'), 'type' => 'number'],
                ['label' => 'In progress', 'value' => $rows->sum('pending') + $rows->sum('confirmed') + $rows->sum('dispatched'), 'type' => 'number'],
                ['label' => 'Invoice value', 'value' => $rows->sum('invoice_value'), 'type' => 'money'],
            ],
            'chart' => ['type' => 'bar', 'x' => 'partner', 'y' => 'orders', 'label' => 'Orders by partner', 'format' => 'number'],
        ];
    }

    /** DB aggregates come back as strings; cast the named columns to int / 2-dp float. */
    private function numeric(object $row, array $ints, array $money): object
    {
        foreach ($ints as $key) {
            $row->{$key} = (int) $row->{$key};
        }
        foreach ($money as $key) {
            $row->{$key} = round((float) $row->{$key}, 2);
        }

        return $row;
    }
}
