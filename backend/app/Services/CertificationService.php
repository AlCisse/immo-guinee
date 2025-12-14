<?php

namespace App\Services;

use App\Models\User;
use App\Models\CertificationDocument;
use Illuminate\Support\Facades\DB;

class CertificationService
{
    /**
     * Badge thresholds
     */
    private const BADGE_THRESHOLDS = [
        'BRONZE' => ['transactions' => 0, 'rating' => 0, 'verification' => 'NON_VERIFIE'],
        'ARGENT' => ['transactions' => 1, 'rating' => 3.5, 'verification' => 'CNI_VERIFIEE'],
        'OR' => ['transactions' => 5, 'rating' => 4.0, 'verification' => 'CNI_VERIFIEE'],
        'DIAMANT' => ['transactions' => 20, 'rating' => 4.5, 'verification' => 'TITRE_FONCIER_VERIFIE'],
    ];

    /**
     * Calculate and upgrade user badge
     */
    public function calculateBadgeUpgrade(User $user): ?string
    {
        $currentBadge = $user->badge_certification;
        $newBadge = $this->determineEligibleBadge($user);

        if ($newBadge !== $currentBadge) {
            DB::transaction(function () use ($user, $newBadge) {
                $user->update(['badge_certification' => $newBadge]);

                // Log badge upgrade
                activity()
                    ->performedOn($user)
                    ->withProperties([
                        'from' => $user->badge_certification,
                        'to' => $newBadge,
                    ])
                    ->log('Badge upgraded');
            });

            return $newBadge;
        }

        return null;
    }

    /**
     * Determine eligible badge based on user metrics
     */
    private function determineEligibleBadge(User $user): string
    {
        // Check from highest to lowest badge
        foreach (array_reverse(self::BADGE_THRESHOLDS, true) as $badge => $thresholds) {
            if ($this->meetsRequirements($user, $thresholds)) {
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

        // Check disputes (should have less than 3 unresolved disputes)
        if ($user->nombre_litiges >= 3) {
            return false;
        }

        return true;
    }

    /**
     * Downgrade badge if user no longer meets requirements
     */
    public function checkBadgeDowngrade(User $user): ?string
    {
        $currentBadge = $user->badge_certification;
        $eligibleBadge = $this->determineEligibleBadge($user);

        if ($eligibleBadge !== $currentBadge) {
            // Downgrade detected
            DB::transaction(function () use ($user, $eligibleBadge) {
                $user->update(['badge_certification' => $eligibleBadge]);

                // Log badge downgrade
                activity()
                    ->performedOn($user)
                    ->withProperties([
                        'from' => $user->badge_certification,
                        'to' => $eligibleBadge,
                        'reason' => 'No longer meets requirements',
                    ])
                    ->log('Badge downgraded');
            });

            return $eligibleBadge;
        }

        return null;
    }

    /**
     * Verify certification document
     */
    public function verifyDocument(CertificationDocument $document, bool $approved, ?string $comment = null): void
    {
        DB::transaction(function () use ($document, $approved, $comment) {
            // Update document status
            $document->update([
                'statut_verification' => $approved ? 'APPROUVE' : 'REJETE',
                'commentaire_verification' => $comment,
                'date_verification' => now(),
                'verifie_par_admin_id' => auth()->id(),
            ]);

            // If approved, update user verification status
            if ($approved) {
                $user = $document->user;

                $newStatus = match($document->type_document) {
                    'CNI' => 'CNI_VERIFIEE',
                    'TITRE_FONCIER' => 'TITRE_FONCIER_VERIFIE',
                    default => $user->statut_verification,
                };

                $user->update(['statut_verification' => $newStatus]);

                // Check for badge upgrade
                $this->calculateBadgeUpgrade($user);
            }

            // Log verification
            activity()
                ->performedOn($document)
                ->withProperties([
                    'approved' => $approved,
                    'comment' => $comment,
                ])
                ->log('Document verification completed');
        });
    }

    /**
     * Get badge progression info for user dashboard
     */
    public function getBadgeProgression(User $user): array
    {
        $currentBadge = $user->badge_certification;
        $badges = array_keys(self::BADGE_THRESHOLDS);
        $currentIndex = array_search($currentBadge, $badges);

        if ($currentIndex === count($badges) - 1) {
            // Already at max badge
            return [
                'current_badge' => $currentBadge,
                'next_badge' => null,
                'progress' => 100,
                'requirements_met' => [],
                'requirements_missing' => [],
            ];
        }

        $nextBadge = $badges[$currentIndex + 1];
        $nextThresholds = self::BADGE_THRESHOLDS[$nextBadge];

        return [
            'current_badge' => $currentBadge,
            'next_badge' => $nextBadge,
            'progress' => $this->calculateProgress($user, $nextThresholds),
            'requirements_met' => $this->getMetRequirements($user, $nextThresholds),
            'requirements_missing' => $this->getMissingRequirements($user, $nextThresholds),
        ];
    }

    /**
     * Calculate progress percentage towards next badge
     */
    private function calculateProgress(User $user, array $thresholds): int
    {
        $weights = ['transactions' => 50, 'rating' => 30, 'verification' => 20];
        $progress = 0;

        // Transactions progress
        $transactionProgress = min(100, ($user->nombre_transactions / max(1, $thresholds['transactions'])) * 100);
        $progress += ($transactionProgress * $weights['transactions']) / 100;

        // Rating progress
        $ratingProgress = min(100, ($user->note_moyenne / max(1, $thresholds['rating'])) * 100);
        $progress += ($ratingProgress * $weights['rating']) / 100;

        // Verification progress
        $verificationMet = $this->meetsVerificationRequirement($user, $thresholds['verification']);
        $progress += $verificationMet ? $weights['verification'] : 0;

        return (int) round($progress);
    }

    private function getMetRequirements(User $user, array $thresholds): array
    {
        $met = [];

        if ($user->nombre_transactions >= $thresholds['transactions']) {
            $met[] = 'transactions';
        }
        if ($user->note_moyenne >= $thresholds['rating']) {
            $met[] = 'rating';
        }
        if ($this->meetsVerificationRequirement($user, $thresholds['verification'])) {
            $met[] = 'verification';
        }

        return $met;
    }

    private function getMissingRequirements(User $user, array $thresholds): array
    {
        $missing = [];

        if ($user->nombre_transactions < $thresholds['transactions']) {
            $missing[] = [
                'type' => 'transactions',
                'current' => $user->nombre_transactions,
                'required' => $thresholds['transactions'],
            ];
        }
        if ($user->note_moyenne < $thresholds['rating']) {
            $missing[] = [
                'type' => 'rating',
                'current' => round($user->note_moyenne, 2),
                'required' => $thresholds['rating'],
            ];
        }
        if (!$this->meetsVerificationRequirement($user, $thresholds['verification'])) {
            $missing[] = [
                'type' => 'verification',
                'current' => $user->statut_verification,
                'required' => $thresholds['verification'],
            ];
        }

        return $missing;
    }

    private function meetsVerificationRequirement(User $user, string $required): bool
    {
        if ($required === 'TITRE_FONCIER_VERIFIE') {
            return $user->statut_verification === 'TITRE_FONCIER_VERIFIE';
        } elseif ($required === 'CNI_VERIFIEE') {
            return in_array($user->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE']);
        }

        return true;
    }
}
