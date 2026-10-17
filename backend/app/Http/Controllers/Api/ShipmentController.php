<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShipmentController extends Controller
{
    private const RELATIONS = ['supplier:id,name', 'store:id,name,code', 'creator:id,name'];

    /**
     * All shipments for the board (not paginated — the board shows every column at once).
     */
    public function index(Request $request)
    {
        $shipments = Shipment::query()
            ->with(self::RELATIONS)
            ->when($request->filled('supplier_id'), fn ($q) => $q->where('supplier_id', $request->input('supplier_id')))
            ->when($request->filled('store_id'), fn ($q) => $q->where('store_id', $request->input('store_id')))
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search')->trim().'%';
                $q->where(fn ($q) => $q->where('shipment_no', 'like', $term)
                    ->orWhere('title', 'like', $term)
                    ->orWhere('tracking_no', 'like', $term)
                    ->orWhere('carrier', 'like', $term)
                    ->orWhere('origin', 'like', $term)
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', $term)));
            })
            ->orderByRaw('eta IS NULL, eta')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $shipments]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['created_by'] = $request->user()->id;

        return response()->json(Shipment::create($data)->load(self::RELATIONS), 201);
    }

    public function show(Shipment $shipment)
    {
        return $shipment->load(self::RELATIONS);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $shipment->update($this->validated($request));

        return $shipment->load(self::RELATIONS);
    }

    /**
     * Move a card to another kanban column.
     */
    public function move(Request $request, Shipment $shipment)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Shipment::STATUSES)],
        ]);

        $shipment->update($data);

        return $shipment->load(self::RELATIONS);
    }

    public function destroy(Shipment $shipment)
    {
        $shipment->delete();

        return response()->json(null, 204);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'store_id' => ['nullable', 'exists:stores,id'],
            'carrier' => ['nullable', 'string', 'max:255'],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'origin' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(Shipment::STATUSES)],
            'order_date' => ['nullable', 'date'],
            'shipped_date' => ['nullable', 'date'],
            'eta' => ['nullable', 'date'],
            'arrived_date' => ['nullable', 'date'],
            'packages' => ['nullable', 'integer', 'min:0'],
            'freight_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
