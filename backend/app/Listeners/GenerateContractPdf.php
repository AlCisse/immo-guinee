<?php

namespace App\Listeners;

use App\Events\ContractSigned;
use App\Jobs\GenerateContractPdfJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class GenerateContractPdf implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     * FR-036: Generate PDF when contract is fully signed
     */
    public function handle(ContractSigned $event): void
    {
        // Only generate PDF if contract is fully signed
        if ($event->contract->isSigned()) {
            Log::info('Contract fully signed, dispatching PDF generation', [
                'contract_id' => $event->contract->id,
            ]);

            // Dispatch job to generate PDF
            GenerateContractPdfJob::dispatch($event->contract);

            Log::info('PDF generation job dispatched', [
                'contract_id' => $event->contract->id,
            ]);
        } else {
            Log::info('Contract partially signed, PDF generation skipped', [
                'contract_id' => $event->contract->id,
                'signer_role' => $event->signerRole,
            ]);
        }
    }
}
