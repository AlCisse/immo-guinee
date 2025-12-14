<?php

namespace App\Services;

use App\Models\Insurance;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * T224 / FR-080: Insurance Certificate PDF Generation Service
 *
 * Generates downloadable insurance certificates for:
 * - SÉJOUR SEREIN (tenant protection)
 * - LOYER GARANTI (landlord protection)
 */
class InsuranceCertificateService
{
    /**
     * Generate insurance certificate PDF.
     */
    public function generate(Insurance $insurance): string
    {
        $insurance->load(['contract.listing', 'assure']);

        $data = $this->prepareData($insurance);

        $pdf = Pdf::loadView('insurances.certificat', $data);
        $pdf->setPaper('a4', 'portrait');

        // Generate filename
        $filename = sprintf(
            'certificats/assurance_%s_%s.pdf',
            $insurance->numero_police,
            now()->format('Ymd_His')
        );

        // Store PDF
        $path = Storage::disk('s3')->put($filename, $pdf->output());

        // Update insurance record with certificate URL
        $insurance->update([
            'certificat_url' => Storage::disk('s3')->url($filename),
            'certificat_generated_at' => now(),
        ]);

        return Storage::disk('s3')->url($filename);
    }

    /**
     * Download certificate as stream.
     */
    public function download(Insurance $insurance)
    {
        $insurance->load(['contract.listing', 'assure']);

        $data = $this->prepareData($insurance);

        $pdf = Pdf::loadView('insurances.certificat', $data);
        $pdf->setPaper('a4', 'portrait');

        $filename = sprintf(
            'Certificat_Assurance_%s.pdf',
            $insurance->numero_police
        );

        return $pdf->download($filename);
    }

    /**
     * Prepare data for certificate template.
     */
    private function prepareData(Insurance $insurance): array
    {
        $contract = $insurance->contract;
        $assure = $insurance->assure;

        // Get contract details
        $listing = $contract->listing ?? null;
        $donnees = $contract->donnees_personnalisees ?? [];

        // Calculate coverage details
        $couvertures = $insurance->couvertures ?? [];
        $plafonds = $insurance->plafonds ?? [];

        // Format coverages for display
        $couverturesFormatees = $this->formatCoverages($insurance->type_assurance, $couvertures, $plafonds);

        return [
            // Certificate Info
            'numero_police' => $insurance->numero_police,
            'type_assurance' => $insurance->type_assurance,
            'type_assurance_label' => $this->getTypeLabel($insurance->type_assurance),
            'date_emission' => now()->format('d/m/Y'),
            'date_souscription' => $insurance->date_souscription?->format('d/m/Y'),
            'date_expiration' => $insurance->date_expiration?->format('d/m/Y'),

            // Insured Person
            'assure_nom' => $assure->nom_complet ?? 'N/A',
            'assure_telephone' => $assure->telephone ?? 'N/A',
            'assure_email' => $assure->email ?? 'N/A',
            'assure_adresse' => $assure->adresse ?? 'N/A',

            // Property Details
            'bien_adresse' => $listing->adresse_complete ?? 'N/A',
            'bien_type' => $listing->type_bien ?? 'N/A',
            'bien_quartier' => $listing->quartier ?? 'N/A',
            'bien_ville' => $listing->ville ?? 'Conakry',

            // Contract Reference
            'contrat_reference' => $contract->reference ?? 'N/A',
            'loyer_mensuel' => $this->formatMoney($donnees['montant_loyer_gnf'] ?? 0),

            // Premium
            'prime_mensuelle' => $this->formatMoney($insurance->prime_mensuelle_gnf ?? 0),
            'prime_annuelle' => $this->formatMoney(($insurance->prime_mensuelle_gnf ?? 0) * 12),

            // Coverages
            'couvertures' => $couverturesFormatees,

            // Terms
            'conditions' => $this->getTermsAndConditions($insurance->type_assurance),

            // Footer
            'numero_urgence' => '+224 621 00 00 00',
            'email_sinistres' => 'sinistres@immoguinee.com',
        ];
    }

    /**
     * Get insurance type label.
     */
    private function getTypeLabel(string $type): string
    {
        return match ($type) {
            'SEJOUR_SEREIN' => 'SÉJOUR SEREIN',
            'LOYER_GARANTI' => 'LOYER GARANTI',
            default => $type,
        };
    }

    /**
     * Format coverages for display.
     */
    private function formatCoverages(string $type, array $couvertures, array $plafonds): array
    {
        if ($type === 'SEJOUR_SEREIN') {
            return [
                [
                    'nom' => 'Protection contre l\'expulsion abusive',
                    'description' => 'Couverture en cas d\'expulsion sans motif légal valable',
                    'plafond' => $plafonds['expulsion'] ?? '3 mois de loyer',
                    'actif' => $couvertures['expulsion_abusive'] ?? false,
                ],
                [
                    'nom' => 'Remboursement de caution',
                    'description' => 'Garantie de récupération de la caution en cas de litige',
                    'plafond' => 'Montant de la caution',
                    'actif' => $couvertures['caution'] ?? false,
                ],
                [
                    'nom' => 'Assistance juridique',
                    'description' => 'Accompagnement juridique en cas de conflit locatif',
                    'plafond' => 'Illimité',
                    'actif' => $couvertures['assistance_juridique'] ?? false,
                ],
            ];
        }

        // LOYER_GARANTI
        return [
            [
                'nom' => 'Garantie loyers impayés',
                'description' => 'Remboursement des loyers non perçus',
                'plafond' => $this->formatMoney($plafonds['impayes'] ?? 0),
                'actif' => $couvertures['impayes'] ?? false,
            ],
            [
                'nom' => 'Dégâts locatifs',
                'description' => 'Couverture des dommages causés par le locataire',
                'plafond' => $this->formatMoney($plafonds['degats'] ?? 0),
                'actif' => $couvertures['degats_locatifs'] ?? false,
            ],
        ];
    }

    /**
     * Get terms and conditions.
     */
    private function getTermsAndConditions(string $type): array
    {
        $commonTerms = [
            'Délai de carence: 30 jours après souscription',
            'Renouvellement automatique sauf résiliation',
            'Préavis de résiliation: 30 jours',
        ];

        if ($type === 'SEJOUR_SEREIN') {
            return array_merge($commonTerms, [
                'Couverture limitée aux situations d\'expulsion non justifiées',
                'Le locataire doit être en règle de ses paiements',
                'Déclaration de sinistre sous 48h maximum',
            ]);
        }

        return array_merge($commonTerms, [
            'Couverture après 2 mois d\'impayés consécutifs',
            'Le contrat de location doit être signé via ImmoGuinée',
            'Déclaration des impayés sous 15 jours',
        ]);
    }

    /**
     * Format money amount.
     */
    private function formatMoney($amount): string
    {
        return number_format($amount, 0, ',', ' ') . ' GNF';
    }

    /**
     * Check if insurance is eligible for claim.
     */
    public function isEligibleForClaim(Insurance $insurance, string $claimType): array
    {
        $eligible = true;
        $reasons = [];

        // Check if insurance is active
        if ($insurance->statut !== 'ACTIVE') {
            $eligible = false;
            $reasons[] = 'L\'assurance n\'est pas active';
        }

        // Check if insurance is expired
        if ($insurance->date_expiration && $insurance->date_expiration < now()) {
            $eligible = false;
            $reasons[] = 'L\'assurance a expiré';
        }

        // Check carence period (30 days)
        $carenceDays = 30;
        if ($insurance->date_souscription && $insurance->date_souscription->addDays($carenceDays) > now()) {
            $eligible = false;
            $daysRemaining = now()->diffInDays($insurance->date_souscription->addDays($carenceDays));
            $reasons[] = "Période de carence en cours ({$daysRemaining} jours restants)";
        }

        // Check if claim type is covered
        $couvertures = $insurance->couvertures ?? [];
        $claimTypeMapping = [
            'expulsion' => 'expulsion_abusive',
            'caution' => 'caution',
            'juridique' => 'assistance_juridique',
            'impayes' => 'impayes',
            'degats' => 'degats_locatifs',
        ];

        $coverageKey = $claimTypeMapping[$claimType] ?? null;
        if ($coverageKey && !($couvertures[$coverageKey] ?? false)) {
            $eligible = false;
            $reasons[] = 'Ce type de sinistre n\'est pas couvert par votre assurance';
        }

        return [
            'eligible' => $eligible,
            'reasons' => $reasons,
        ];
    }

    /**
     * Calculate compensation amount.
     */
    public function calculateCompensation(Insurance $insurance, string $claimType, int $requestedAmount): array
    {
        $plafonds = $insurance->plafonds ?? [];

        // Get plafond for claim type
        $plafond = match ($claimType) {
            'expulsion' => $this->parsePlafond($plafonds['expulsion'] ?? 0, $insurance),
            'caution' => $insurance->contract->donnees_personnalisees['montant_caution_gnf'] ?? 0,
            'impayes' => $plafonds['impayes'] ?? 0,
            'degats' => $plafonds['degats'] ?? 0,
            default => 0,
        };

        // Calculate approved amount
        $approvedAmount = min($requestedAmount, $plafond);

        return [
            'requested_amount' => $requestedAmount,
            'plafond' => $plafond,
            'approved_amount' => $approvedAmount,
            'exceeds_plafond' => $requestedAmount > $plafond,
        ];
    }

    /**
     * Parse plafond value (handles "3_mois_loyer" format).
     */
    private function parsePlafond($plafond, Insurance $insurance)
    {
        if (is_numeric($plafond)) {
            return (int) $plafond;
        }

        if (str_contains($plafond, 'mois_loyer')) {
            $months = (int) str_replace('_mois_loyer', '', $plafond);
            $monthlyRent = $insurance->contract->donnees_personnalisees['montant_loyer_gnf'] ?? 0;
            return $months * $monthlyRent;
        }

        return 0;
    }
}
