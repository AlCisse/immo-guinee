<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\EscrowService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPaymentConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Payment $payment,
        public string $gateway,
        public array $webhookData
    ) {}

    /**
     * Execute the job.
     * FR-043 step 4: Process payment confirmation from webhook
     */
    public function handle(EscrowService $escrowService): void
    {
        Log::info('Processing payment confirmation', [
            'payment_id' => $this->payment->id,
            'gateway' => $this->gateway,
        ]);

        try {
            // Validate webhook data based on gateway
            $status = $this->extractStatus();

            if ($status === 'success') {
                // Update payment status to CONFIRME
                $this->payment->update([
                    'statut' => 'CONFIRME',
                    'date_confirmation' => now(),
                ]);

                // If escrow payment, put in escrow
                if ($this->payment->type_paiement === 'ESCROW') {
                    $escrowService->holdInEscrow($this->payment);

                    // Schedule escrow timeout check (48h)
                    ProcessEscrowTimeoutJob::dispatch($this->payment)
                        ->delay(now()->addHours(48));
                }

                // Log activity
                activity()
                    ->performedOn($this->payment)
                    ->withProperties(['gateway' => $this->gateway, 'webhook_data' => $this->webhookData])
                    ->log('Payment confirmed via ' . $this->gateway);

                Log::info('Payment confirmed successfully', ['payment_id' => $this->payment->id]);
            } else {
                // Payment failed
                $this->payment->update(['statut' => 'ECHOUE']);

                Log::warning('Payment failed', [
                    'payment_id' => $this->payment->id,
                    'reason' => $this->webhookData['error_message'] ?? 'Unknown',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Payment confirmation processing failed', [
                'payment_id' => $this->payment->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Extract payment status from webhook data
     */
    private function extractStatus(): string
    {
        return match ($this->gateway) {
            'ORANGE_MONEY' => $this->webhookData['status'] === 'SUCCESSFUL' ? 'success' : 'failed',
            'MTN_MOMO' => $this->webhookData['status'] === 'SUCCESSFUL' ? 'success' : 'failed',
            default => 'failed',
        };
    }
}
