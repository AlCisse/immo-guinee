<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestCascadeDeleteCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:test-cascade-delete
                            {user_id : The UUID of the user to test}
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--force : Actually perform the force delete}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test cascade delete for a user - shows related data counts and optionally deletes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id');
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');

        $user = User::withTrashed()->find($userId);

        if (!$user) {
            $this->error("User not found with ID: {$userId}");
            return 1;
        }

        $this->info("=== User Cascade Delete Test ===");
        $this->info("User: {$user->nom_complet} ({$user->telephone})");
        $this->info("ID: {$user->id}");
        $this->info("Type: {$user->type_compte}");
        $this->info("Deleted: " . ($user->trashed() ? 'Yes (soft deleted)' : 'No'));
        $this->newLine();

        // Count all related data
        $relatedData = [
            'Listings' => $user->listings()->withTrashed()->count(),
            'Contracts (as bailleur)' => $user->contractsAsBailleur()->withTrashed()->count(),
            'Contracts (as locataire)' => $user->contractsAsLocataire()->withTrashed()->count(),
            'Payments (made)' => $user->paymentsMade()->count(),
            'Payments (received)' => $user->paymentsReceived()->count(),
            'Certification Documents' => $user->certificationDocuments()->count(),
            'Conversations (initiated)' => $user->conversationsInitiated()->count(),
            'Conversations (as participant)' => $user->conversationsAsParticipant()->count(),
            'Messages (sent)' => $user->messages()->count(),
            'Disputes (filed)' => $user->disputesFiled()->count(),
            'Disputes (against)' => $user->disputesAgainst()->count(),
            'Disputes (mediated)' => $user->disputesMediated()->count(),
            'Transactions (as bailleur)' => $user->transactionsAsBailleur()->count(),
            'Transactions (as locataire)' => $user->transactionsAsLocataire()->count(),
            'Ratings (given)' => $user->ratingsGiven()->count(),
            'Ratings (received)' => $user->ratingsReceived()->count(),
            'Insurances' => $user->insurances()->count(),
            'Favorites' => $user->favorites()->count(),
            'WhatsApp Messages' => $user->whatsappMessages()->count(),
            'Reports (made)' => $user->reportsMade()->count(),
            'Reports (received)' => $user->reportsReceived()->count(),
            'Moderation Actions' => $user->moderationActions()->count(),
            'Visits (as proprietaire)' => $user->visitsAsProprietaire()->withTrashed()->count(),
            'Visits (as visiteur)' => $user->visitsAsVisiteur()->withTrashed()->count(),
            // Note: OAuth tokens use bigint user_id but we use UUID - count skipped
            'OAuth Tokens' => 0,
        ];

        $this->info("=== Related Data Counts ===");
        $totalRelated = 0;
        foreach ($relatedData as $name => $count) {
            $totalRelated += $count;
            $this->line("{$name}: {$count}");
        }
        $this->newLine();
        $this->info("Total related records: {$totalRelated}");
        $this->newLine();

        if ($dryRun) {
            $this->warn("=== DRY RUN MODE ===");
            $this->info("No data was deleted. Use --force to actually delete.");
            return 0;
        }

        if (!$force) {
            $this->warn("Use --dry-run to preview or --force to actually delete.");
            return 0;
        }

        // Confirm before force delete
        if (!$this->confirm("Are you sure you want to PERMANENTLY DELETE this user and all {$totalRelated} related records? This cannot be undone!")) {
            $this->info("Aborted.");
            return 0;
        }

        $this->info("=== Performing Force Delete ===");

        DB::beginTransaction();
        try {
            // Force delete the user (cascade delete will handle related data)
            $user->forceDelete();

            DB::commit();

            $this->info("User and all related data have been permanently deleted.");

            // Verify deletion
            $checkUser = User::withTrashed()->find($userId);
            if (!$checkUser) {
                $this->info("Verification: User no longer exists in database.");
            } else {
                $this->error("Verification FAILED: User still exists!");
                return 1;
            }

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error during deletion: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
}
