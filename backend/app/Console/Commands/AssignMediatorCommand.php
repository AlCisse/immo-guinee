<?php

namespace App\Console\Commands;

use App\Models\Dispute;
use App\Models\User;
use App\Notifications\MediatorAssignedNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * T209 / FR-073: Auto-assign mediators to unassigned disputes
 *
 * Runs daily to assign available mediators to open disputes
 * that have been unassigned for more than 24 hours.
 */
class AssignMediatorCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'immog:assign-mediators
                            {--dispute= : Assign to specific dispute ID only}
                            {--mediator= : Force assignment to specific mediator ID}
                            {--dry-run : Preview assignments without applying}
                            {--force : Assign even to recently opened disputes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-assign mediators to unassigned disputes (FR-073)';

    /**
     * Maximum disputes per mediator for load balancing.
     */
    private const MAX_DISPUTES_PER_MEDIATOR = 10;

    /**
     * Hours after which unassigned dispute gets auto-assignment.
     */
    private const ASSIGNMENT_DELAY_HOURS = 24;

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $startTime = now();
        $this->info('Starting mediator auto-assignment...');

        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        $specificDisputeId = $this->option('dispute');
        $forcedMediatorId = $this->option('mediator');

        if ($dryRun) {
            $this->warn('Running in DRY-RUN mode - no changes will be applied');
        }

        try {
            // Get available mediators
            $mediators = $this->getAvailableMediators($forcedMediatorId);

            if ($mediators->isEmpty()) {
                $this->warn('No available mediators found. Skipping assignment.');
                return self::SUCCESS;
            }

            $this->info("Found {$mediators->count()} available mediator(s)");

            // Get unassigned disputes
            $disputes = $this->getUnassignedDisputes($specificDisputeId, $force);

            if ($disputes->isEmpty()) {
                $this->info('No disputes pending assignment.');
                return self::SUCCESS;
            }

            $this->info("Found {$disputes->count()} dispute(s) pending assignment");

            $assigned = 0;
            $errors = 0;

            $this->output->progressStart($disputes->count());

            foreach ($disputes as $dispute) {
                try {
                    $mediator = $this->selectMediator($dispute, $mediators, $forcedMediatorId);

                    if ($mediator) {
                        $result = $this->assignMediator($dispute, $mediator, $dryRun);

                        if ($result) {
                            $assigned++;
                            $this->updateMediatorLoad($mediators, $mediator->id);
                        }
                    } else {
                        $this->warn("No suitable mediator found for dispute {$dispute->reference_litige}");
                    }
                } catch (\Exception $e) {
                    $errors++;
                    Log::channel('disputes')->error('Failed to assign mediator', [
                        'dispute_id' => $dispute->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                $this->output->progressAdvance();
            }

            $this->output->progressFinish();

            // Summary
            $duration = now()->diffInSeconds($startTime);
            $this->newLine();
            $this->info("=== Assignment Complete ===");
            $this->info("Duration: {$duration}s");
            $this->info("Disputes processed: {$disputes->count()}");
            $this->info("Assigned: {$assigned}");

            if ($errors > 0) {
                $this->warn("Errors: {$errors}");
            }

            // Log summary
            Log::channel('disputes')->info('Mediator auto-assignment completed', [
                'duration_seconds' => $duration,
                'disputes_processed' => $disputes->count(),
                'assigned' => $assigned,
                'errors' => $errors,
                'dry_run' => $dryRun,
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Command failed: {$e->getMessage()}");
            Log::channel('disputes')->error('Mediator auto-assignment failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return self::FAILURE;
        }
    }

    /**
     * Get available mediators with their current dispute load.
     */
    private function getAvailableMediators(?string $forcedMediatorId)
    {
        $query = User::query()
            ->role('mediator')
            ->where('is_active', true)
            ->where('is_suspended', false)
            ->withCount(['disputesMediated as active_disputes_count' => function ($query) {
                $query->whereNotIn('statut', ['RESOLU_AMIABLE', 'RESOLU_JUDICIAIRE', 'FERME']);
            }])
            ->having('active_disputes_count', '<', self::MAX_DISPUTES_PER_MEDIATOR);

        if ($forcedMediatorId) {
            $query->where('id', $forcedMediatorId);
        }

        return $query->orderBy('active_disputes_count', 'asc')->get();
    }

    /**
     * Get disputes that need mediator assignment.
     */
    private function getUnassignedDisputes(?string $specificDisputeId, bool $force)
    {
        $query = Dispute::query()
            ->whereNull('mediateur_id')
            ->where('statut', 'OUVERT')
            ->where('is_closed', false);

        if (!$force) {
            // Only assign to disputes opened more than 24 hours ago
            $query->where('created_at', '<=', now()->subHours(self::ASSIGNMENT_DELAY_HOURS));
        }

        if ($specificDisputeId) {
            $query->where('id', $specificDisputeId);
        }

        return $query->with(['plaignant', 'defendeur', 'contract'])->get();
    }

    /**
     * Select the best mediator for a dispute.
     * Considers:
     * - Current workload
     * - No conflict of interest (not involved in the dispute)
     * - Expertise in dispute category if applicable
     */
    private function selectMediator(Dispute $dispute, $mediators, ?string $forcedMediatorId): ?User
    {
        if ($forcedMediatorId) {
            return $mediators->firstWhere('id', $forcedMediatorId);
        }

        // Filter out mediators with conflict of interest
        $eligibleMediators = $mediators->filter(function ($mediator) use ($dispute) {
            // Mediator cannot be involved in the dispute
            if ($mediator->id === $dispute->plaignant_id || $mediator->id === $dispute->defendeur_id) {
                return false;
            }

            // Mediator cannot have mediated previous disputes between same parties
            $previousMediation = Dispute::query()
                ->where('mediateur_id', $mediator->id)
                ->where(function ($q) use ($dispute) {
                    $q->where(function ($q2) use ($dispute) {
                        $q2->where('plaignant_id', $dispute->plaignant_id)
                           ->where('defendeur_id', $dispute->defendeur_id);
                    })->orWhere(function ($q2) use ($dispute) {
                        $q2->where('plaignant_id', $dispute->defendeur_id)
                           ->where('defendeur_id', $dispute->plaignant_id);
                    });
                })
                ->exists();

            return !$previousMediation;
        });

        if ($eligibleMediators->isEmpty()) {
            return null;
        }

        // Select mediator with lowest workload
        return $eligibleMediators->sortBy('active_disputes_count')->first();
    }

    /**
     * Assign a mediator to a dispute.
     */
    private function assignMediator(Dispute $dispute, User $mediator, bool $dryRun): bool
    {
        if ($this->output->isVerbose()) {
            $this->line("Assigning mediator {$mediator->nom_complet} to dispute {$dispute->reference_litige}");
        }

        if ($dryRun) {
            return true;
        }

        DB::beginTransaction();

        try {
            $dispute->update([
                'mediateur_id' => $mediator->id,
                'statut' => 'EN_MEDIATION',
                'mediation_started_at' => now(),
            ]);

            // Notify all parties
            $this->notifyParties($dispute, $mediator);

            DB::commit();

            Log::channel('disputes')->info('Mediator assigned to dispute', [
                'dispute_id' => $dispute->id,
                'dispute_reference' => $dispute->reference_litige,
                'mediator_id' => $mediator->id,
                'mediator_name' => $mediator->nom_complet,
            ]);

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update mediator's workload in the collection.
     */
    private function updateMediatorLoad($mediators, string $mediatorId): void
    {
        $mediator = $mediators->firstWhere('id', $mediatorId);
        if ($mediator) {
            $mediator->active_disputes_count++;

            // Remove from pool if at max capacity
            if ($mediator->active_disputes_count >= self::MAX_DISPUTES_PER_MEDIATOR) {
                $mediators->forget($mediators->search($mediator));
            }
        }
    }

    /**
     * Notify all parties about mediator assignment.
     */
    private function notifyParties(Dispute $dispute, User $mediator): void
    {
        // Notify complainant
        if ($dispute->plaignant) {
            $dispute->plaignant->notify(new MediatorAssignedNotification($dispute, $mediator, 'plaignant'));
        }

        // Notify defendant
        if ($dispute->defendeur) {
            $dispute->defendeur->notify(new MediatorAssignedNotification($dispute, $mediator, 'defendeur'));
        }

        // Notify mediator
        $mediator->notify(new MediatorAssignedNotification($dispute, $mediator, 'mediator'));
    }
}
