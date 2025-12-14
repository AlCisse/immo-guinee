<?php

namespace App\Jobs;

use App\Models\CertificationDocument;
use App\Services\CertificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessDocumentVerificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 180;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public CertificationDocument $document
    ) {}

    /**
     * Execute the job.
     * FR-054: Process document verification (OCR, validation)
     */
    public function handle(CertificationService $certificationService): void
    {
        Log::info('Processing document verification', ['document_id' => $this->document->id]);

        try {
            // Update status to EN_COURS
            $this->document->update(['statut_verification' => 'EN_COURS']);

            // Simulate OCR and validation
            // In production, integrate with actual OCR service (Google Vision, AWS Textract, etc.)
            sleep(2); // Simulate processing delay

            // For now, auto-approve (in production, implement real verification)
            $isValid = true; // Replace with actual verification logic

            if ($isValid) {
                $this->document->update([
                    'statut_verification' => 'VERIFIE',
                    'date_verification' => now(),
                ]);

                // Check if user can be upgraded
                UpdateBadgeCertificationJob::dispatch($this->document->utilisateur);

                Log::info('Document verified successfully', ['document_id' => $this->document->id]);
            } else {
                $this->document->update([
                    'statut_verification' => 'REJETE',
                    'date_verification' => now(),
                ]);

                Log::warning('Document rejected', ['document_id' => $this->document->id]);
            }

            // Log activity
            activity()
                ->performedOn($this->document)
                ->log('Document verification completed: ' . $this->document->statut_verification);
        } catch (\Exception $e) {
            $this->document->update(['statut_verification' => 'REJETE']);

            Log::error('Document verification failed', [
                'document_id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
