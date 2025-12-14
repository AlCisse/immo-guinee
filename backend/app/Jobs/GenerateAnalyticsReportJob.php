<?php

namespace App\Jobs;

use App\Models\{User, Listing, Payment, Dispute, Rating};
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GenerateAnalyticsReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $reportType = 'daily'
    ) {}

    /**
     * Execute the job.
     * FR-084: Generate analytics report and cache results
     */
    public function handle(): void
    {
        Log::info('Generating analytics report', ['type' => $this->reportType]);

        try {
            $analytics = [
                'generated_at' => now()->toIso8601String(),
                'type' => $this->reportType,
                'users' => [
                    'total' => User::count(),
                    'active' => User::where('statut_compte', 'ACTIF')->count(),
                    'verified' => User::whereIn('statut_verification', ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE'])->count(),
                    'new_this_month' => User::whereMonth('created_at', now()->month)->count(),
                    'by_badge' => [
                        'bronze' => User::where('badge_certification', 'BRONZE')->count(),
                        'argent' => User::where('badge_certification', 'ARGENT')->count(),
                        'or' => User::where('badge_certification', 'OR')->count(),
                        'diamant' => User::where('badge_certification', 'DIAMANT')->count(),
                    ],
                ],
                'listings' => [
                    'total' => Listing::count(),
                    'disponible' => Listing::where('statut', 'DISPONIBLE')->count(),
                    'loue_vendu' => Listing::where('statut', 'LOUE_VENDU')->count(),
                    'avg_price_gnf' => Listing::where('statut', 'DISPONIBLE')->avg('prix_gnf'),
                    'by_type' => [
                        'location' => Listing::where('type_annonce', 'LOCATION')->count(),
                        'vente' => Listing::where('type_annonce', 'VENTE')->count(),
                    ],
                ],
                'payments' => [
                    'total_volume_gnf' => Payment::where('statut', 'CONFIRME')->sum('montant_total_gnf'),
                    'commission_collected_gnf' => Payment::where('statut', 'CONFIRME')->sum('commission_plateforme_gnf'),
                    'pending_count' => Payment::whereIn('statut', ['INITIE', 'EN_ESCROW'])->count(),
                    'avg_transaction_gnf' => Payment::where('statut', 'CONFIRME')->avg('montant_total_gnf'),
                ],
                'disputes' => [
                    'total' => Dispute::count(),
                    'open' => Dispute::where('statut', 'OUVERT')->count(),
                    'resolved' => Dispute::whereIn('statut', ['RESOLU_AMIABLE', 'RESOLU_COMPENSATION'])->count(),
                    'avg_resolution_days' => Dispute::whereNotNull('date_resolution')
                        ->selectRaw('AVG(DATEDIFF(date_resolution, date_ouverture)) as avg_days')
                        ->value('avg_days'),
                ],
                'ratings' => [
                    'total' => Rating::count(),
                    'avg_rating' => Rating::where('statut_moderation', 'APPROUVE')->avg('note_globale'),
                    'pending_moderation' => Rating::where('statut_moderation', 'EN_ATTENTE')->count(),
                ],
            ];

            // Cache for 1 hour
            $cacheKey = "analytics_report_{$this->reportType}_" . now()->format('Y-m-d-H');
            Cache::put($cacheKey, $analytics, now()->addHour());

            Log::info('Analytics report generated and cached', [
                'type' => $this->reportType,
                'cache_key' => $cacheKey,
            ]);
        } catch (\Exception $e) {
            Log::error('Analytics report generation failed', [
                'type' => $this->reportType,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
