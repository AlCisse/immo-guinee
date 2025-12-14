<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessPaymentConfirmationJob;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Orange Money webhook (FR-043 step 4)
     */
    public function orangeMoney(Request $request)
    {
        // Verify webhook signature
        $signature = $request->header('X-Orange-Signature');
        if (!$this->verifyOrangeSignature($request->all(), $signature)) {
            Log::warning('Invalid Orange Money webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = $request->all();

        // Find payment by external transaction ID
        $payment = Payment::where('numero_transaction_externe', $data['transaction_id'] ?? null)
            ->first();

        if (!$payment) {
            Log::error('Payment not found for Orange Money webhook', $data);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        // Dispatch job to process payment confirmation
        ProcessPaymentConfirmationJob::dispatch($payment, 'ORANGE_MONEY', $data);

        return response()->json(['status' => 'received'], 200);
    }

    /**
     * MTN Mobile Money webhook (FR-043 step 4)
     */
    public function mtnMomo(Request $request)
    {
        // Verify webhook signature
        $signature = $request->header('X-MTN-Signature');
        if (!$this->verifyMtnSignature($request->all(), $signature)) {
            Log::warning('Invalid MTN MoMo webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = $request->all();

        // Find payment
        $payment = Payment::where('numero_transaction_externe', $data['transaction_id'] ?? null)
            ->first();

        if (!$payment) {
            Log::error('Payment not found for MTN webhook', $data);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        // Dispatch job
        ProcessPaymentConfirmationJob::dispatch($payment, 'MTN_MOMO', $data);

        return response()->json(['status' => 'received'], 200);
    }

    /**
     * WhatsApp webhook (WAHA)
     */
    public function whatsapp(Request $request)
    {
        $data = $request->all();

        Log::info('WhatsApp webhook received', $data);

        // Handle incoming messages
        if (isset($data['event']) && $data['event'] === 'message') {
            // Process incoming WhatsApp message
            // This could be used for customer support, notifications acknowledgment, etc.
        }

        return response()->json(['status' => 'received'], 200);
    }

    /**
     * Verify Orange Money webhook signature
     */
    private function verifyOrangeSignature(array $data, ?string $signature): bool
    {
        if (!$signature) {
            return false;
        }

        $secret = config('services.orange_money.webhook_secret');
        $computedSignature = hash_hmac('sha256', json_encode($data), $secret);

        return hash_equals($computedSignature, $signature);
    }

    /**
     * Verify MTN MoMo webhook signature
     */
    private function verifyMtnSignature(array $data, ?string $signature): bool
    {
        if (!$signature) {
            return false;
        }

        $secret = config('services.mtn_momo.webhook_secret');
        $computedSignature = hash_hmac('sha256', json_encode($data), $secret);

        return hash_equals($computedSignature, $signature);
    }
}
