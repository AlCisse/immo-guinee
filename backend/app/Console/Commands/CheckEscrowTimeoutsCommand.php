<?php

namespace App\Console\Commands;

use App\Jobs\ProcessEscrowTimeoutJob;
use App\Models\Payment;
use Illuminate\Console\Command;

class CheckEscrowTimeoutsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'escrow:check-timeouts';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and release escrow payments that have exceeded 48h timeout (FR-045)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking escrow timeouts...');

        // Find all payments in escrow status
        $escrowPayments = Payment::where('statut', 'EN_ESCROW')
            ->where('date_confirmation', '<=', now()->subHours(48))
            ->get();

        $this->info("Found {$escrowPayments->count()} payments in escrow exceeding 48h.");

        $processed = 0;

        foreach ($escrowPayments as $payment) {
            try {
                // Dispatch job to process escrow timeout
                ProcessEscrowTimeoutJob::dispatch($payment);
                $processed++;

                $this->line("Dispatched escrow timeout job for payment {$payment->id}");
            } catch (\Exception $e) {
                $this->error("Failed to dispatch job for payment {$payment->id}: {$e->getMessage()}");
            }
        }

        $this->info("Processed {$processed} escrow timeout jobs.");

        return Command::SUCCESS;
    }
}
