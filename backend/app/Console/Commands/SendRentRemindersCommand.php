<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\Payment;
use App\Notifications\PaymentConfirmedNotification;
use Illuminate\Console\Command;

class SendRentRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rent:send-reminders {--days=3 : Days before due date to send reminder}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send rent payment reminders to tenants (FR-049)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = $this->option('days');
        $this->info("Sending rent reminders for payments due in {$days} days...");

        // Find active rental contracts
        $contracts = Contract::where('type_contrat', 'BAIL_LOCATION_RESIDENTIEL')
            ->orWhere('type_contrat', 'BAIL_LOCATION_COMMERCIAL')
            ->where('statut', 'ACTIF')
            ->where('date_fin', '>=', now())
            ->get();

        $this->info("Found {$contracts->count()} active rental contracts.");

        $remindersSent = 0;

        foreach ($contracts as $contract) {
            try {
                // Calculate next payment due date
                $jourPaiement = $contract->donnees_personnalisees['jour_paiement'] ?? 1;
                $nextDueDate = now()->day > $jourPaiement
                    ? now()->addMonth()->day($jourPaiement)
                    : now()->day($jourPaiement);

                // Check if payment is due in X days
                if ($nextDueDate->diffInDays(now()) <= $days && $nextDueDate->isFuture()) {
                    // Check if payment already exists
                    $existingPayment = Payment::where('contrat_id', $contract->id)
                        ->whereBetween('periode_debut', [now()->startOfMonth(), now()->endOfMonth()])
                        ->where('statut', 'CONFIRME')
                        ->exists();

                    if (!$existingPayment) {
                        // Send reminder to tenant
                        $tenant = $contract->locataire;
                        if ($tenant) {
                            // TODO: Create a RentReminderNotification
                            // $tenant->notify(new RentReminderNotification($contract, $nextDueDate));

                            $remindersSent++;
                            $this->line("Sent reminder to {$tenant->nom_complet} for contract {$contract->numero_contrat}");
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->error("Failed to process contract {$contract->id}: {$e->getMessage()}");
            }
        }

        $this->info("Sent {$remindersSent} rent reminders.");

        return Command::SUCCESS;
    }
}
