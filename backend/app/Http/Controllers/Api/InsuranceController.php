<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InsuranceResource;
use App\Models\Insurance;
use App\Services\InsuranceCertificateService;
use Illuminate\Http\Request;

class InsuranceController extends Controller
{
    public function __construct(
        private InsuranceCertificateService $certificateService
    ) {}

    /**
     * Subscribe to insurance
     * FR-076
     */
    public function subscribe(Request $request)
    {
        $this->authorize('subscribe', Insurance::class);

        $validated = $request->validate([
            'contrat_id' => 'required|uuid|exists:contracts,id',
            'type_assurance' => 'required|in:SEJOUR_SEREIN,LOYER_GARANTI',
        ]);

        // Calculate premium (2% of monthly rent for SEJOUR_SEREIN)
        $contract = \App\Models\Contract::findOrFail($validated['contrat_id']);
        $monthlyRent = $contract->donnees_personnalisees['montant_loyer_gnf'] ?? 0;
        $prime = (int) round($monthlyRent * 0.02);

        // Define coverages based on type
        $couvertures = $validated['type_assurance'] === 'SEJOUR_SEREIN'
            ? ['expulsion_abusive' => true, 'caution' => true, 'assistance_juridique' => true]
            : ['impayes' => true, 'degats_locatifs' => true];

        $plafonds = $validated['type_assurance'] === 'SEJOUR_SEREIN'
            ? ['expulsion' => '3_mois_loyer', 'degats' => $monthlyRent * 3]
            : ['impayes' => $monthlyRent * 6, 'degats' => $monthlyRent * 2];

        $insurance = Insurance::create([
            'utilisateur_id' => auth()->id(),
            'contrat_id' => $validated['contrat_id'],
            'type_assurance' => $validated['type_assurance'],
            'numero_police' => 'ASSUR-' . strtoupper($validated['type_assurance'] === 'SEJOUR_SEREIN' ? 'SS' : 'LG') . '-' . strtoupper(substr(uniqid(), -4)),
            'prime_mensuelle_gnf' => $prime,
            'couvertures' => $couvertures,
            'plafonds' => $plafonds,
            'statut' => 'ACTIVE',
            'date_souscription' => now(),
            'date_expiration' => now()->addYear(),
        ]);

        return new InsuranceResource($insurance);
    }

    /**
     * Make insurance claim
     * FR-077, FR-078
     */
    public function claim(Request $request, Insurance $insurance)
    {
        $this->authorize('claim', $insurance);

        $validated = $request->validate([
            'type_claim' => 'required|string',
            'description' => 'required|string|min:100|max:2000',
            'montant_reclame_gnf' => 'required|integer|min:0',
            'preuves.*' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Here you would process the claim
        // For now, just log it
        activity()
            ->performedOn($insurance)
            ->withProperties($validated)
            ->log('Insurance claim submitted');

        return response()->json([
            'message' => 'Claim submitted successfully. You will be contacted within 48 hours.',
        ]);
    }

    /**
     * Get my insurances
     */
    public function my(Request $request)
    {
        $insurances = Insurance::where('utilisateur_id', auth()->id())
            ->with('contract')
            ->orderBy('date_souscription', 'desc')
            ->get();

        return InsuranceResource::collection($insurances);
    }

    /**
     * Cancel insurance
     */
    public function cancel(Insurance $insurance)
    {
        $this->authorize('cancel', $insurance);

        $insurance->update(['statut' => 'RESILIEE']);

        return response()->json(['message' => 'Insurance cancelled']);
    }

    /**
     * Download certificate
     * FR-080
     */
    public function downloadCertificate(Insurance $insurance)
    {
        $this->authorize('downloadCertificate', $insurance);

        return $this->certificateService->download($insurance);
    }

    /**
     * Check claim eligibility
     */
    public function checkClaimEligibility(Request $request, Insurance $insurance)
    {
        $this->authorize('claim', $insurance);

        $validated = $request->validate([
            'type_claim' => 'required|string|in:expulsion,caution,juridique,impayes,degats',
        ]);

        $eligibility = $this->certificateService->isEligibleForClaim(
            $insurance,
            $validated['type_claim']
        );

        return response()->json($eligibility);
    }

    /**
     * Get insurance details with coverage info
     */
    public function show(Insurance $insurance)
    {
        $this->authorize('view', $insurance);

        $insurance->load(['contract.listing', 'assure']);

        return new InsuranceResource($insurance);
    }
}
