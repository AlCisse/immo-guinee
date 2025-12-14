<?php

namespace App\Console\Commands;

use App\Jobs\ProcessDocumentVerificationJob;
use App\Models\CertificationDocument;
use Illuminate\Console\Command;

class ProcessPendingVerificationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'verifications:process {--limit=10 : Maximum number of verifications to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process pending document verifications (FR-054)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = $this->option('limit');
        $this->info("Processing up to {$limit} pending document verifications...");

        // Find pending documents
        $pendingDocuments = CertificationDocument::where('statut_verification', 'EN_ATTENTE')
            ->orderBy('created_at', 'asc')
            ->limit($limit)
            ->get();

        $this->info("Found {$pendingDocuments->count()} pending documents.");

        if ($pendingDocuments->isEmpty()) {
            $this->info('No pending verifications to process.');
            return Command::SUCCESS;
        }

        $processed = 0;

        foreach ($pendingDocuments as $document) {
            try {
                // Dispatch verification job
                ProcessDocumentVerificationJob::dispatch($document);
                $processed++;

                $this->line("Dispatched verification job for document {$document->id} ({$document->type_document})");
            } catch (\Exception $e) {
                $this->error("Failed to dispatch job for document {$document->id}: {$e->getMessage()}");
            }
        }

        $this->info("Dispatched {$processed} verification jobs.");

        return Command::SUCCESS;
    }
}
