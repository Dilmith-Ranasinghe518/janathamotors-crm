<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function store(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'in:cash,card,bank_transfer,other'],
        ]);

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages(['invoice' => ['Cannot pay a cancelled invoice.']]);
        }

        if ($data['amount'] > $invoice->due_amount) {
            throw ValidationException::withMessages(['amount' => ['Amount exceeds the outstanding due of '.$invoice->due_amount.'.']]);
        }

        $payment = DB::transaction(function () use ($data, $invoice, $request) {
            $payment = $invoice->payments()->create([
                'amount' => $data['amount'],
                'method' => $data['method'],
                'paid_at' => now(),
                'received_by' => $request->user()->id,
            ]);

            $invoice->paid_amount += $data['amount'];
            $invoice->due_amount -= $data['amount'];
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : 'partial';
            $invoice->save();

            if ($invoice->customer_id) {
                $invoice->customer()->decrement('current_due', $data['amount']);
            }

            return $payment;
        });

        return response()->json($invoice->fresh(['payments', 'customer']), 201);
    }
}
