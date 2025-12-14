<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Events\ContractStatusUpdated;
use App\Notifications\RetractionPeriodExpiredNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckRetractionPeriodCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contracts:check-retraction
                            {--dry-run : Run without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and process contracts with expired retraction periods (FR-033: 48h countdown)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for contracts with expired retraction periods...');

        $dryRun = $this->option('dry-run');

        // Find contracts with expired retraction period that haven't been finalized
        $contracts = Contract::where('statut', 'signe')
            ->whereNotNull('delai_retractation_expire')
            ->where('delai_retractation_expire', '<', now())
            ->where('est_verrouille', true)
            ->whereNull('retractation_expiree_le')
            ->get();

        $count = $contracts->count();
        $this->info("Found {$count} contract(s) with expired retraction period.");

        if ($count === 0) {
            return Command::SUCCESS;
        }

        $processed = 0;
        $errors = 0;

        foreach ($contracts as $contract) {
            try {
                $this->processExpiredRetraction($contract, $dryRun);
                $processed++;
            } catch (\Exception $e) {
                $errors++;
                Log::error('Failed to process expired retraction', [
                    'contract_id' => $contract->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Error processing contract {$contract->reference}: {$e->getMessage()}");
            }
        }

        $this->info("Processed: {$processed}, Errors: {$errors}");

        // Also check for contracts approaching retraction expiry (send reminders)
        $this->checkApproachingExpiry($dryRun);

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * Process a contract with expired retraction period
     */
    protected function processExpiredRetraction(Contract $contract, bool $dryRun): void
    {
        $this->line("Processing contract: {$contract->reference}");

        if ($dryRun) {
            $this->info("  [DRY RUN] Would finalize contract {$contract->reference}");
            return;
        }

        // Update contract status to fully archived
        $contract->update([
            'statut' => 'SIGNE_ARCHIVE',
            'retractation_expiree_le' => now(),
            'est_actif' => true, // Contract is now active
        ]);

        // Notify both parties that retraction period has expired
        $contract->proprietaire->notify(new RetractionPeriodExpiredNotification($contract));
        $contract->locataire->notify(new RetractionPeriodExpiredNotification($contract));

        // Broadcast status update
        event(new ContractStatusUpdated($contract));

        Log::info('Contract retraction period expired - contract finalized', [
            'contract_id' => $contract->id,
            'reference' => $contract->reference,
            'finalized_at' => now()->toIso8601String(),
        ]);

        $this->info("  Contract {$contract->reference} finalized successfully.");
    }

    /**
     * Check for contracts approaching retraction expiry and send reminders
     */
    protected function checkApproachingExpiry(bool $dryRun): void
    {
        $this->info('Checking for contracts approaching retraction expiry...');

        // Find contracts expiring in the next 6 hours
        $contracts = Contract::where('statut', 'signe')
            ->whereNotNull('delai_retractation_expire')
            ->where('delai_retractation_expire', '>', now())
            ->where('delai_retractation_expire', '<', now()->addHours(6))
            ->whereNull('rappel_retractation_envoye')
            ->get();

        $count = $contracts->count();
        $this->info("Found {$count} contract(s) approaching retraction expiry.");

        foreach ($contracts as $contract) {
            $hoursRemaining = now()->diffInHours($contract->delai_retractation_expire, false);

            $this->line("Contract {$contract->reference}: {$hoursRemaining} hours remaining");

            if (!$dryRun) {
                // Send reminder notification
                $contract->proprietaire->notify(new RetractionReminderNotification($contract, $hoursRemaining));
                $contract->locataire->notify(new RetractionReminderNotification($contract, $hoursRemaining));

                // Mark reminder as sent
                $contract->update(['rappel_retractation_envoye' => now()]);
            }
        }
    }
}

/**
 * Notification for retraction period expiry (placeholder - should be in separate file)
 */
class RetractionReminderNotification extends \Illuminate\Notifications\Notification
{
    use \Illuminate\Bus\Queueable;

    protected Contract $contract;
    protected int $hoursRemaining;

    public function __construct(Contract $contract, int $hoursRemaining)
    {
        $this->contract = $contract;
        $this->hoursRemaining = $hoursRemaining;
    }

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): \Illuminate\Notifications\Messages\MailMessage
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject("Rappel: {$this->hoursRemaining}h avant expiration de la période de rétractation")
            ->line("Votre contrat {$this->contract->reference} sera définitivement actif dans {$this->hoursRemaining} heures.")
            ->line("Passé ce délai, vous ne pourrez plus annuler le contrat.")
            ->action('Voir le contrat', url('/contrats/' . $this->contract->id));
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'retraction_reminder',
            'contract_id' => $this->contract->id,
            'contract_reference' => $this->contract->reference,
            'hours_remaining' => $this->hoursRemaining,
        ];
    }
}
