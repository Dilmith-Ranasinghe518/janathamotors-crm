<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\WhatsappOrder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WhatsappOrderController extends Controller
{
    private const RELATIONS = ['invoice:id,invoice_no,total,status', 'creator:id,name'];

    public function index(Request $request)
    {
        return WhatsappOrder::query()
            ->with(self::RELATIONS)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('shipping_partner'), fn ($q) => $q->where('shipping_partner', $request->input('shipping_partner')))
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search')->trim().'%';
                $q->where(fn ($q) => $q->where('order_no', 'like', $term)
                    ->orWhere('tracking_no', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('customer_phone', 'like', $term)
                    ->orWhere('vehicle_no', 'like', $term)
                    ->orWhere('driver_name', 'like', $term)
                    ->orWhereHas('invoice', fn ($iq) => $iq->where('invoice_no', 'like', $term)));
            })
            ->latest('order_date')
            ->latest('id')
            ->paginate(25);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['created_by'] = $request->user()->id;

        return response()->json(WhatsappOrder::create($data)->load(self::RELATIONS), 201);
    }

    public function show(WhatsappOrder $whatsappOrder)
    {
        return $whatsappOrder->load(self::RELATIONS);
    }

    public function update(Request $request, WhatsappOrder $whatsappOrder)
    {
        $whatsappOrder->update($this->validated($request));

        return $whatsappOrder->load(self::RELATIONS);
    }

    public function updateStatus(Request $request, WhatsappOrder $whatsappOrder)
    {
        $whatsappOrder->update($request->validate([
            'status' => ['required', Rule::in(WhatsappOrder::STATUSES)],
        ]));

        return $whatsappOrder->load(self::RELATIONS);
    }

    public function destroy(WhatsappOrder $whatsappOrder)
    {
        $whatsappOrder->delete();

        return response()->json(null, 204);
    }

    /**
     * Invoice lookup for the order form, with the customer details used to prefill it.
     */
    public function invoices(Request $request)
    {
        return Invoice::query()
            ->with('customer:id,name,phone,address')
            ->where('status', '!=', 'cancelled')
            ->when($request->string('search')->isNotEmpty(), function ($q) use ($request) {
                $term = '%'.$request->string('search')->trim().'%';
                $q->where(fn ($q) => $q->where('invoice_no', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('customer_phone', 'like', $term)
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', $term)->orWhere('phone', 'like', $term)));
            })
            ->latest()
            ->limit(20)
            ->get(['id', 'invoice_no', 'customer_id', 'customer_name', 'customer_phone', 'total', 'status', 'created_at']);
    }

    private function validated(Request $request): array
    {
        $isRide = in_array($request->input('shipping_partner'), WhatsappOrder::RIDE_PARTNERS, true);

        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'order_date' => ['required', 'date'],
            'shipping_partner' => ['required', Rule::in(WhatsappOrder::PARTNERS)],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => [Rule::requiredIf($isRide), 'nullable', Rule::in(WhatsappOrder::VEHICLE_TYPES)],
            'vehicle_no' => ['nullable', 'string', 'max:50'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_mobile' => ['nullable', 'string', 'max:30'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'shipping_address' => ['nullable', 'string'],
            'status' => ['required', Rule::in(WhatsappOrder::STATUSES)],
            'notes' => ['nullable', 'string'],
        ]);

        // Keep only the delivery fields that apply to the chosen partner.
        if ($isRide) {
            $data['tracking_no'] = null;
        } else {
            $data['vehicle_type'] = $data['vehicle_no'] = $data['driver_name'] = $data['driver_mobile'] = null;
        }

        return $data;
    }
}
