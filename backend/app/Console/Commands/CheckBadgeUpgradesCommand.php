<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\CertificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * T173 [US5] CheckBadgeUpgradesCommand
 * FR-053: Auto-upgrade badges based on user metrics
 *
 * Checks all eligible users and upgrades their badges if they meet requirements.
 * Should be run periodically via scheduler (daily recommended).
 */
class CheckBadgeUpgradesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'immog:check-badge-upgrades
                            {--user= : Check specific user ID only}
                            {--dry-run : Preview changes without applying}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and upgrade user badges based on certification requirements (FR-053)';

    /**
     * Execute the console command.
     */
    public function handle(CertificationService $certificationService): int
    {
        $this->info('Starting badge upgrade check...');

        $dryRun = $this->option('dry-run');
        $specificUserId = $this->option('user');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be applied');
        }

        // Build query for eligible users
        $query = User::query()
            ->whereIn('type_utilisateur', ['PROPRIETAIRE', 'LOCATAIRE'])
            ->where('badge_certification', '!=', 'DIAMANT'); // Skip already max badge

        if ($specificUserId) {
            $query->where('id', $specificUserId);
        }

        $users = $query->get();
        $this->info("Checking {$users->count()} users for potential upgrades...");

        $upgradedCount = 0;
        $upgrades = [];

        $progressBar = $this->output->createProgressBar($users->count());
        $progressBar->start();

        foreach ($users as $user) {
            $currentBadge = $user->badge_certification;

            if ($dryRun) {
                // Simulate upgrade check without saving
                $wouldUpgrade = $this->simulateUpgradeCheck($user, $certificationService);
                if ($wouldUpgrade) {
                    $upgrades[] = [
                        'user_id' => $user->id,
                        'name' => $user->nom_complet,
                        'from' => $currentBadge,
                        'to' => $wouldUpgrade,
                    ];
                    $upgradedCount++;
                }
            } else {
                // Actually perform upgrade
                $newBadge = $certificationService->calculateBadgeUpgrade($user);

                if ($newBadge) {
                    $upgrades[] = [
                        'user_id' => $user->id,
                        'name' => $user->nom_complet,
                        'from' => $currentBadge,
                        'to' => $newBadge,
                    ];
                    $upgradedCount++;

                    // Send notification to user
                    $this->notifyUserOfUpgrade($user, $currentBadge, $newBadge);
                }
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        if ($upgradedCount > 0) {
            $this->info("Badge upgrades " . ($dryRun ? 'that would be applied' : 'applied') . ": {$upgradedCount}");
            $this->newLine();

            $this->table(
                ['User ID', 'Name', 'From Badge', 'To Badge'],
                array_map(fn($u) => [$u['user_id'], $u['name'], $u['from'], $u['to']], $upgrades)
            );

            // Log upgrades
            Log::channel('certification')->info('Badge upgrade check completed', [
                'dry_run' => $dryRun,
                'total_checked' => $users->count(),
                'upgraded' => $upgradedCount,
                'upgrades' => $upgrades,
            ]);
        } else {
            $this->info('No users eligible for badge upgrade.');
        }

        $this->info('Badge upgrade check completed.');

        return Command::SUCCESS;
    }

    /**
     * Simulate badge upgrade check without saving
     */
    private function simulateUpgradeCheck(User $user, CertificationService $service): ?string
    {
        // Use reflection to access private method or duplicate logic
        $badgeOrder = ['BRONZE', 'ARGENT', 'OR', 'DIAMANT'];
        $currentIndex = array_search($user->badge_certification, $badgeOrder);

        if ($currentIndex === false || $currentIndex >= count($badgeOrder) - 1) {
            return null;
        }

        // Check next badge eligibility
        $thresholds = [
            'BRONZE' => ['transactions' => 0, 'rating' => 0, 'verification' => 'NON_VERIFIE'],
            'ARGENT' => ['transactions' => 1, 'rating' => 3.5, 'verification' => 'CNI_VERIFIEE'],
            'OR' => ['transactions' => 5, 'rating' => 4.0, 'verification' => 'CNI_VERIFIEE'],
            'DIAMANT' => ['transactions' => 20, 'rating' => 4.5, 'verification' => 'TITRE_FONCIER_VERIFIE'],
        ];

        // Check from highest possible badge down
        foreach (array_reverse($badgeOrder) as $badge) {
            if (array_search($badge, $badgeOrder) <= $currentIndex) {
                continue;
            }

            $threshold = $thresholds[$badge];

            if ($this->meetsThreshold($user, $threshold)) {
                return $badge;
            }
        }

        return null;
    }

    /**
     * Check if user meets threshold requirements
     */
    private function meetsThreshold(User $user, array $threshold): bool
    {
        // Check transactions
        if ($user->nombre_transactions < $threshold['transactions']) {
            return false;
        }

        // Check rating
        if ($user->note_moyenne < $threshold['rating']) {
            return false;
        }

        // Check verification
        if ($threshold['verification'] === 'TITRE_FONCIER_VERIFIE') {
            if ($user->statut_verification !== 'TITRE_FONCIER_VERIFIE') {
                return false;
            }
        } elseif ($threshold['verification'] === 'CNI_VERIFIEE') {
            if (!in_array($user->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE'])) {
                return false;
            }
        }

        // Check disputes
        if ($user->nombre_litiges >= 3) {
            return false;
        }

        return true;
    }

    /**
     * Send notification to user about badge upgrade
     */
    private function notifyUserOfUpgrade(User $user, string $fromBadge, string $toBadge): void
    {
        try {
            // Create in-app notification
            $user->notifications()->create([
                'type' => 'badge_upgrade',
                'titre' => 'Félicitations ! Badge mis à niveau',
                'message' => "Votre badge a été mis à niveau de {$fromBadge} à {$toBadge}. " .
                    "Continuez à maintenir d'excellentes performances pour débloquer plus d'avantages !",
                'data' => [
                    'from_badge' => $fromBadge,
                    'to_badge' => $toBadge,
                    'upgraded_at' => now()->toISOString(),
                ],
            ]);

            // Dispatch event for real-time notification and n8n webhook
            event(new \App\Events\BadgeUpgraded($user, $fromBadge, $toBadge));

        } catch (\Exception $e) {
            Log::error('Failed to send badge upgrade notification', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
