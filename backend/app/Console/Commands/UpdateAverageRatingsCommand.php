<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * T204 / FR-071: Update average ratings for all users
 *
 * Recalculates avg_rating for users based on published ratings received.
 * Run nightly to ensure rating accuracy.
 */
class UpdateAverageRatingsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'immog:update-average-ratings
                            {--user= : Update specific user ID only}
                            {--dry-run : Preview changes without applying}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate and update average ratings for all users (FR-071)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $startTime = now();
        $this->info('Starting average ratings update...');

        $dryRun = $this->option('dry-run');
        $specificUserId = $this->option('user');

        if ($dryRun) {
            $this->warn('Running in DRY-RUN mode - no changes will be applied');
        }

        try {
            // Build query for users to update
            $usersQuery = User::query()
                ->where('is_active', true);

            if ($specificUserId) {
                $usersQuery->where('id', $specificUserId);
            }

            $users = $usersQuery->get();
            $updated = 0;
            $unchanged = 0;
            $errors = 0;

            $this->output->progressStart($users->count());

            foreach ($users as $user) {
                try {
                    $result = $this->updateUserRating($user, $dryRun);

                    if ($result === 'updated') {
                        $updated++;
                    } elseif ($result === 'unchanged') {
                        $unchanged++;
                    } else {
                        $errors++;
                    }
                } catch (\Exception $e) {
                    $errors++;
                    Log::channel('ratings')->error('Failed to update rating for user', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                $this->output->progressAdvance();
            }

            $this->output->progressFinish();

            // Summary
            $duration = now()->diffInSeconds($startTime);
            $this->newLine();
            $this->info("=== Update Complete ===");
            $this->info("Duration: {$duration}s");
            $this->info("Users processed: {$users->count()}");
            $this->info("Updated: {$updated}");
            $this->info("Unchanged: {$unchanged}");

            if ($errors > 0) {
                $this->warn("Errors: {$errors}");
            }

            // Log summary
            Log::channel('ratings')->info('Average ratings update completed', [
                'duration_seconds' => $duration,
                'users_processed' => $users->count(),
                'updated' => $updated,
                'unchanged' => $unchanged,
                'errors' => $errors,
                'dry_run' => $dryRun,
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Command failed: {$e->getMessage()}");
            Log::channel('ratings')->error('Average ratings update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return self::FAILURE;
        }
    }

    /**
     * Update a single user's average rating.
     */
    private function updateUserRating(User $user, bool $dryRun): string
    {
        // Calculate new average from published ratings
        $stats = DB::table('ratings')
            ->where('evalue_id', $user->id)
            ->where('is_published', true)
            ->whereNull('deleted_at')
            ->selectRaw('
                COUNT(*) as count,
                AVG(note) as avg_note,
                AVG(note_communication) as avg_communication,
                AVG(note_ponctualite) as avg_ponctualite,
                AVG(note_proprete) as avg_proprete,
                AVG(note_respect_contrat) as avg_respect_contrat
            ')
            ->first();

        $newAvgRating = $stats->count > 0 ? round($stats->avg_note, 2) : null;
        $currentRating = $user->avg_rating;

        // Check if update is needed
        if ($newAvgRating == $currentRating) {
            return 'unchanged';
        }

        if ($this->output->isVerbose()) {
            $this->line("User {$user->id}: {$currentRating} -> {$newAvgRating} (based on {$stats->count} ratings)");
        }

        if ($dryRun) {
            return 'updated';
        }

        // Apply update
        $user->update([
            'avg_rating' => $newAvgRating,
        ]);

        // Log significant changes (more than 0.5 point difference)
        if ($currentRating !== null && abs($newAvgRating - $currentRating) > 0.5) {
            Log::channel('ratings')->info('Significant rating change detected', [
                'user_id' => $user->id,
                'old_rating' => $currentRating,
                'new_rating' => $newAvgRating,
                'total_ratings' => $stats->count,
            ]);
        }

        return 'updated';
    }
}
