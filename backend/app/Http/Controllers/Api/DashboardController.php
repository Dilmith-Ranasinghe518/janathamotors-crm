<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        $salesSince = fn ($since) => Invoice::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since)
            ->sum('total');

        return response()->json([
            'sales_today' => $salesSince($today),
            'sales_this_week' => $salesSince($weekStart),
            'sales_this_month' => $salesSince($monthStart),
            'outstanding_due' => Invoice::where('status', '!=', 'cancelled')->sum('due_amount'),
            'low_stock_products' => Product::query()
                ->select('id', 'sku', 'name', 'reorder_level')
                ->whereRaw('(select coalesce(sum(quantity), 0) from stock_ledger where stock_ledger.product_id = products.id) <= products.reorder_level')
                ->limit(10)
                ->get(),
            'top_selling_products' => InvoiceItem::query()
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->where('invoices.status', '!=', 'cancelled')
                ->where('invoices.created_at', '>=', $monthStart)
                ->groupBy('products.id', 'products.name')
                ->orderByDesc(DB::raw('sum(invoice_items.quantity)'))
                ->limit(5)
                ->get(['products.id', 'products.name', DB::raw('sum(invoice_items.quantity) as quantity_sold')]),
            'revenue_trend' => Invoice::where('status', '!=', 'cancelled')
                ->where('created_at', '>=', now()->subDays(13)->startOfDay())
                ->selectRaw('DATE(created_at) as date, SUM(total) as total')
                ->groupBy('date')
                ->orderBy('date')
                ->get(),
        ]);
    }
}
