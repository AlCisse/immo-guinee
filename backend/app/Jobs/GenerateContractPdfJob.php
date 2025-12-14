<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateContractPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 180;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Contract $contract
    ) {}

    /**
     * Execute the job.
     * FR-036: Generate encrypted PDF contract
     */
    public function handle(ContractService $contractService): void
    {
        Log::info('Generating contract PDF', ['contract_id' => $this->contract->id]);

        try {
            // Generate PDF using ContractService
            $pdfContent = $contractService->generatePdf($this->contract);

            // Store PDF in storage/app/contracts
            $filename = "contrat-{$this->contract->numero_contrat}.pdf";
            $path = "contracts/{$filename}";

            Storage::put($path, $pdfContent);

            // Update contract with PDF path
            $this->contract->update([
                'pdf_path' => $path,
                'pdf_generated_at' => now(),
            ]);

            // Log activity
            activity()
                ->performedOn($this->contract)
                ->log('Contract PDF generated');

            Log::info('Contract PDF generated successfully', [
                'contract_id' => $this->contract->id,
                'path' => $path,
            ]);
        } catch (\Exception $e) {
            Log::error('Contract PDF generation failed', [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
