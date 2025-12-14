<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\CertificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * T174 [US5] CheckBadgeDowngradesCommand
 * FR-058: Auto-downgrade badges when users no longer meet requirements
 *
 * Checks users with premium badges and downgrades if they no longer meet requirements.
 * Should be run periodically via scheduler (weekly recommended).
 */
class CheckBadgeDowngradesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'immog:check-badge-downgrades
                            {--user= : Check specific user ID only}
                            {--dry-run : Preview changes without applying}
                            {--include-bronze : Also check Bronze users (normally skipped)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and downgrade user badges if they no longer meet requirements (FR-058)';

    /**
     * Badge thresholds - must match CertificationService
     */
    private const BADGE_THRESHOLDS = [
        'BRONZE' => ['transactions' => 0, 'rating' => 0, 'verification' => 'NON_VERIFIE', 'max_disputes' => 999],
        'ARGENT' => ['transactions' => 1, 'rating' => 3.5, 'verification' => 'CNI_VERIFIEE', 'max_disputes' => 3],
        'OR' => ['transactions' => 5, 'rating' => 4.0, 'verification' => 'CNI_VERIFIEE', 'max_disputes' => 3],
        'DIAMANT' => ['transactions' => 20, 'rating' => 4.5, 'verification' => 'TITRE_FONCIER_VERIFIE', 'max_disputes' => 3],
    ];

    /**
     * Execute the console command.
     */
    public function handle(CertificationService $certificationService): int
    {
        $this->info('Starting badge downgrade check...');

        $dryRun = $this->option('dry-run');
        $specificUserId = $this->option('user');
        $includeBronze = $this->option('include-bronze');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be applied');
        }

        // Build query for users with badges higher than Bronze
        $query = User::query()
            ->whereIn('type_utilisateur', ['PROPRIETAIRE', 'LOCATAIRE']);

        if (!$includeBronze) {
            $query->where('badge_certification', '!=', 'BRONZE');
        }

        if ($specificUserId) {
            $query->where('id', $specificUserId);
        }

        $users = $query->get();
        $this->info("Checking {$users->count()} users for potential downgrades...");

        $downgradedCount = 0;
        $downgrades = [];

        $progressBar = $this->output->createProgressBar($users->count());
        $progressBar->start();

        foreach ($users as $user) {
            $currentBadge = $user->badge_certification;
            $eligibleBadge = $this->determineEligibleBadge($user);

            // Check if downgrade is needed (eligible badge is lower than current)
            if ($this->isBadgeLower($eligibleBadge, $currentBadge)) {
                if ($dryRun) {
                    $downgrades[] = [
                        'user_id' => $user->id,
                        'name' => $user->nom_complet,
                        'from' => $currentBadge,
                        'to' => $eligibleBadge,
                        'reason' => $this->getDowngradeReason($user, $currentBadge),
                    ];
                    $downgradedCount++;
                } else {
                    // Actually perform downgrade
                    $newBadge = $certificationService->checkBadgeDowngrade($user);

                    if ($newBadge) {
                        $reason = $this->getDowngradeReason($user, $currentBadge);
                        $downgrades[] = [
                            'user_id' => $user->id,
                            'name' => $user->nom_complet,
                            'from' => $currentBadge,
                            'to' => $newBadge,
                            'reason' => $reason,
                        ];
                        $downgradedCount++;

                        // Send notification to user
                        $this->notifyUserOfDowngrade($user, $currentBadge, $newBadge, $reason);
                    }
                }
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        if ($downgradedCount > 0) {
            $this->warn("Badge downgrades " . ($dryRun ? 'that would be applied' : 'applied') . ": {$downgradedCount}");
            $this->newLine();

            $this->table(
                ['User ID', 'Name', 'From Badge', 'To Badge', 'Reason'],
                array_map(fn($d) => [$d['user_id'], $d['name'], $d['from'], $d['to'], $d['reason']], $downgrades)
            );

            // Log downgrades
            Log::channel('certification')->warning('Badge downgrade check completed', [
                'dry_run' => $dryRun,
                'total_checked' => $users->count(),
                'downgraded' => $downgradedCount,
                'downgrades' => $downgrades,
            ]);
        } else {
            $this->info('No users need badge downgrade.');
        }

        $this->info('Badge downgrade check completed.');

        return Command::SUCCESS;
    }

    /**
     * Determine what badge user is eligible for based on current metrics
     */
    private function determineEligibleBadge(User $user): string
    {
        $badges = ['DIAMANT', 'OR', 'ARGENT', 'BRONZE'];

        foreach ($badges as $badge) {
            if ($this->meetsRequirements($user, self::BADGE_THRESHOLDS[$badge])) {
                return $badge;
            }
        }

        return 'BRONZE';
    }

    /**
     * Check if user meets requirements for a badge
     */
    private function meetsRequirements(User $user, array $thresholds): bool
    {
        // Check transactions
        if ($user->nombre_transactions < $thresholds['transactions']) {
            return false;
        }

        // Check rating
        if ($user->note_moyenne < $thresholds['rating']) {
            return false;
        }

        // Check verification status
        if ($thresholds['verification'] === 'TITRE_FONCIER_VERIFIE') {
            if ($user->statut_verification !== 'TITRE_FONCIER_VERIFIE') {
                return false;
            }
        } elseif ($thresholds['verification'] === 'CNI_VERIFIEE') {
            if (!in_array($user->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE'])) {
                return false;
            }
        }

        // Check disputes
        if ($user->nombre_litiges >= $thresholds['max_disputes']) {
            return false;
        }

        return true;
    }

    /**
     * Check if badge1 is lower than badge2
     */
    private function isBadgeLower(string $badge1, string $badge2): bool
    {
        $order = ['BRONZE' => 0, 'ARGENT' => 1, 'OR' => 2, 'DIAMANT' => 3];

        return ($order[$badge1] ?? 0) < ($order[$badge2] ?? 0);
    }

    /**
     * Get human-readable reason for downgrade
     */
    private function getDowngradeReason(User $user, string $requiredBadge): string
    {
        $threshold = self::BADGE_THRESHOLDS[$requiredBadge];
        $reasons = [];

        if ($user->note_moyenne < $threshold['rating']) {
            $reasons[] = "Note moyenne ({$user->note_moyenne}) < {$threshold['rating']}";
        }

        if ($user->nombre_litiges >= $threshold['max_disputes']) {
            $reasons[] = "Litiges ({$user->nombre_litiges}) >= {$threshold['max_disputes']}";
        }

        if ($threshold['verification'] === 'TITRE_FONCIER_VERIFIE') {
            if ($user->statut_verification !== 'TITRE_FONCIER_VERIFIE') {
                $reasons[] = "Vérification requise: TITRE_FONCIER";
            }
        } elseif ($threshold['verification'] === 'CNI_VERIFIEE') {
            if (!in_array($user->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE'])) {
                $reasons[] = "CNI non vérifiée";
            }
        }

        return implode(', ', $reasons) ?: 'Conditions non remplies';
    }

    /**
     * Send notification to user about badge downgrade
     */
    private function notifyUserOfDowngrade(User $user, string $fromBadge, string $toBadge, string $reason): void
    {
        try {
            // Create in-app notification
            $user->notifications()->create([
                'type' => 'badge_downgrade',
                'titre' => 'Badge rétrogradé',
                'message' => "Votre badge a été rétrogradé de {$fromBadge} à {$toBadge}. " .
                    "Raison: {$reason}. " .
                    "Améliorez vos performances pour récupérer votre niveau !",
                'data' => [
                    'from_badge' => $fromBadge,
                    'to_badge' => $toBadge,
                    'reason' => $reason,
                    'downgraded_at' => now()->toISOString(),
                ],
            ]);

            // Dispatch event for real-time notification and n8n webhook
            event(new \App\Events\BadgeDowngraded($user, $fromBadge, $toBadge, $reason));

        } catch (\Exception $e) {
            Log::error('Failed to send badge downgrade notification', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
