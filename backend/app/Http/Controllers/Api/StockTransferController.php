<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockLedger;
use App\Models\StockTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $query = StockTransfer::query()
            ->with([
                'fromStore:id,name,code,location',
                'toStore:id,name,code,location',
                'creator:id,name',
                'items.product:id,sku,name,unit',
            ]);

        if ($request->filled('from_store_id')) {
            $query->where('from_store_id', $request->input('from_store_id'));
        }

        if ($request->filled('to_store_id')) {
            $query->where('to_store_id', $request->input('to_store_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(function ($q) use ($search) {
                $q->where('transfer_no', 'like', '%'.$search.'%')
                  ->orWhereHas('fromStore', fn ($sq) => $sq->where('name', 'like', '%'.$search.'%')->orWhere('code', 'like', '%'.$search.'%'))
                  ->orWhereHas('toStore', fn ($sq) => $sq->where('name', 'like', '%'.$search.'%')->orWhere('code', 'like', '%'.$search.'%'));
            });
        }

        return response()->json($query->latest('transferred_at')->latest('id')->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'from_store_id' => ['required', 'exists:stores,id'],
            'to_store_id' => ['required', 'exists:stores,id', 'different:from_store_id'],
            'transferred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $transfer = DB::transaction(function () use ($data, $request) {
            $transferNo = 'TRF-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));

            $transfer = StockTransfer::create([
                'transfer_no' => $transferNo,
                'from_store_id' => $data['from_store_id'],
                'to_store_id' => $data['to_store_id'],
                'transferred_at' => $data['transferred_at'],
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'notes' => $item['notes'] ?? null,
                ]);

                // 1. Deduct stock from Source Store
                StockLedger::create([
                    'product_id' => $item['product_id'],
                    'store_id' => $data['from_store_id'],
                    'type' => 'transfer_out',
                    'quantity' => -$item['quantity'],
                    'reference_type' => StockTransfer::class,
                    'reference_id' => $transfer->id,
                    'created_by' => $request->user()->id,
                    'note' => "Transferred to Store #{$data['to_store_id']} ({$transferNo})",
                ]);

                // 2. Add stock to Destination Store
                StockLedger::create([
                    'product_id' => $item['product_id'],
                    'store_id' => $data['to_store_id'],
                    'type' => 'transfer_in',
                    'quantity' => $item['quantity'],
                    'reference_type' => StockTransfer::class,
                    'reference_id' => $transfer->id,
                    'created_by' => $request->user()->id,
                    'note' => "Received from Store #{$data['from_store_id']} ({$transferNo})",
                ]);
            }

            return $transfer;
        });

        return response()->json(
            $transfer->load([
                'fromStore:id,name,code,location',
                'toStore:id,name,code,location',
                'creator:id,name',
                'items.product:id,sku,name,unit',
            ]),
            201
        );
    }

    public function show(StockTransfer $stockTransfer)
    {
        return response()->json(
            $stockTransfer->load([
                'fromStore:id,name,code,location,address',
                'toStore:id,name,code,location,address',
                'creator:id,name',
                'items.product:id,sku,name,unit,cost_price,selling_price',
            ])
        );
    }
}
