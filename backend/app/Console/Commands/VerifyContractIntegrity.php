<?php

namespace App\Console\Commands;

use App\Services\IntegrityService;
use Illuminate\Console\Command;

class VerifyContractIntegrity extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'contracts:verify-integrity
                            {--contract= : Verify a specific contract by ID}
                            {--all : Verify all contracts}
                            {--report : Generate detailed report}';

    /**
     * The console command description.
     */
    protected $description = 'Verify integrity of archived contracts in WORM storage';

    public function __construct(
        protected IntegrityService $integrityService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $contractId = $this->option('contract');

        if ($contractId) {
            return $this->verifySingleContract($contractId);
        }

        if ($this->option('all')) {
            return $this->verifyAllContracts();
        }

        $this->error('Please specify --contract=<id> or --all');
        return Command::FAILURE;
    }

    protected function verifySingleContract(string $contractId): int
    {
        $this->info("Verifying contract: {$contractId}");

        $contract = \App\Models\Contract::find($contractId);
        if (!$contract) {
            $this->error("Contract not found: {$contractId}");
            return Command::FAILURE;
        }

        if ($this->option('report')) {
            $report = $this->integrityService->generateIntegrityReport($contract);
            $this->displayReport($report);
        } else {
            $result = $this->integrityService->verifyContractIntegrity($contract);
            $this->displayResult($contract, $result);
        }

        return Command::SUCCESS;
    }

    protected function verifyAllContracts(): int
    {
        $this->info('Starting integrity verification of all archived contracts...');
        $this->newLine();

        $progressBar = $this->output->createProgressBar();
        $progressBar->start();

        $results = $this->integrityService->verifyAllContracts();

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->info('=== Verification Summary ===');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Contracts', $results['total']],
                ['Valid', "<fg=green>{$results['valid']}</>"],
                ['Invalid', $results['invalid'] > 0 ? "<fg=red>{$results['invalid']}</>" : '0'],
                ['Errors', $results['errors'] > 0 ? "<fg=yellow>{$results['errors']}</>" : '0'],
            ]
        );

        if (!empty($results['violations'])) {
            $this->newLine();
            $this->error('=== VIOLATIONS DETECTED ===');
            foreach ($results['violations'] as $violation) {
                $this->warn("- Contract: {$violation['reference']} ({$violation['contract_id']})");
                $this->warn("  Status: {$violation['status']}");
                $this->warn("  Error: {$violation['error']}");
            }
        }

        return ($results['invalid'] > 0 || $results['errors'] > 0)
            ? Command::FAILURE
            : Command::SUCCESS;
    }

    protected function displayResult($contract, array $result): void
    {
        $status = $result['verified'] ? '<fg=green>VALID</>' : '<fg=red>INVALID</>';

        $this->info("Contract: {$contract->numero_contrat}");
        $this->line("Status: {$status}");

        if (!$result['verified']) {
            $this->error("Error: {$result['error']}");
            $this->error("Status Code: {$result['status']}");
        } else {
            $this->info("File Size: {$result['file_size']} bytes");
            $this->info("Last Verified: {$result['last_verified']}");
        }
    }

    protected function displayReport(array $report): void
    {
        $this->info('=== Contract Integrity Report ===');
        $this->newLine();

        $status = $report['is_valid'] ? '<fg=green>VALID</>' : '<fg=red>INVALID</>';

        $this->table(
            ['Field', 'Value'],
            [
                ['Contract Reference', $report['contract_reference']],
                ['Contract ID', $report['contract_id']],
                ['Integrity Status', $status],
            ]
        );

        $this->newLine();
        $this->info('Archive Information:');
        $this->table(
            ['Field', 'Value'],
            [
                ['Archived At', $report['archive_info']['archived_at']],
                ['Retention Until', $report['archive_info']['retention_until']],
                ['Storage', $report['archive_info']['storage_location']],
                ['File Size', $report['archive_info']['file_size_bytes'] . ' bytes'],
            ]
        );

        $this->newLine();
        $this->info('Security Information:');
        $this->table(
            ['Field', 'Value'],
            [
                ['Encryption', $report['security_info']['encryption']],
                ['Hash Algorithm', $report['security_info']['hash_algorithm']],
                ['Original Hash', $report['security_info']['original_hash']],
                ['Encrypted Hash', $report['security_info']['encrypted_hash']],
            ]
        );

        $this->newLine();
        $this->info('Signatures:');
        $this->table(
            ['Field', 'Value'],
            [
                ['Bailleur Signed', $report['signatures']['bailleur_signed_at'] ?? 'Not signed'],
                ['Locataire Signed', $report['signatures']['locataire_signed_at'] ?? 'Not signed'],
                ['Digital Seal', $report['signatures']['cachet_electronique'] ?? 'Not applied'],
            ]
        );

        $this->newLine();
        $this->info('Legal Compliance:');
        $this->table(
            ['Field', 'Value'],
            [
                ['Standard', $report['legal_compliance']['standard']],
                ['Law Reference', $report['legal_compliance']['law_reference']],
                ['WORM Protected', $report['legal_compliance']['worm_protected'] ? 'Yes' : 'No'],
            ]
        );

        $this->newLine();
        $this->line("Report generated at: {$report['generated_at']}");
    }
}
