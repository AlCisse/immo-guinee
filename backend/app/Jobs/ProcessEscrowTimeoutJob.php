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

class ProcessEscrowTimeoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Payment $payment
    ) {}

    /**
     * Execute the job.
     * FR-045: Auto-release escrow after 48h if no dispute
     */
    public function handle(EscrowService $escrowService): void
    {
        Log::info('Checking escrow timeout', ['payment_id' => $this->payment->id]);

        // Refresh payment from database
        $this->payment->refresh();

        // Only process if still in escrow
        if ($this->payment->statut !== 'EN_ESCROW') {
            Log::info('Payment no longer in escrow, skipping', ['payment_id' => $this->payment->id]);
            return;
        }

        // Check if 48h has passed since confirmation
        $hoursInEscrow = $this->payment->date_confirmation->diffInHours(now());

        if ($hoursInEscrow >= 48) {
            try {
                // Auto-release to landlord
                $escrowService->releaseToLandlord($this->payment);

                // Log activity
                activity()
                    ->performedOn($this->payment)
                    ->withProperties(['hours_in_escrow' => $hoursInEscrow])
                    ->log('Escrow auto-released after 48h timeout');

                Log::info('Escrow auto-released successfully', [
                    'payment_id' => $this->payment->id,
                    'hours_in_escrow' => $hoursInEscrow,
                ]);
            } catch (\Exception $e) {
                Log::error('Escrow auto-release failed', [
                    'payment_id' => $this->payment->id,
                    'error' => $e->getMessage(),
                ]);

                throw $e;
            }
        } else {
            Log::info('Escrow timeout not reached yet', [
                'payment_id' => $this->payment->id,
                'hours_in_escrow' => $hoursInEscrow,
            ]);
        }
    }
}
