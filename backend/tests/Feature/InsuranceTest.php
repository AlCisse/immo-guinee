<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Insurance;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T230: Insurance Feature Tests
 *
 * Tests insurance subscription, claims, and certificate generation
 * for SÉJOUR SEREIN (tenant) and LOYER GARANTI (landlord) products.
 */
class InsuranceTest extends TestCase
{
    use RefreshDatabase;

    private User $tenant;
    private User $landlord;
    private Contract $contract;
    private Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->create([
            'role' => 'bailleur',
            'email_verified_at' => now(),
        ]);

        $this->tenant = User::factory()->create([
            'role' => 'locataire',
            'email_verified_at' => now(),
        ]);

        $this->listing = Listing::factory()->create([
            'proprietaire_id' => $this->landlord->id,
            'statut' => 'PUBLIE',
        ]);

        $this->contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'locataire_id' => $this->tenant->id,
            'bailleur_id' => $this->landlord->id,
            'statut' => 'SIGNE',
            'donnees_personnalisees' => [
                'montant_loyer_gnf' => 5000000,
                'montant_caution_gnf' => 10000000,
            ],
        ]);
    }

    // ==================== SUBSCRIPTION TESTS ====================

    /** @test */
    public function tenant_can_subscribe_to_sejour_serein_insurance(): void
    {
        $response = $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'SEJOUR_SEREIN',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'numero_police',
                    'type_assurance',
                    'prime_mensuelle_gnf',
                    'couvertures',
                    'plafonds',
                    'statut',
                    'date_souscription',
                    'date_expiration',
                ],
            ]);

        $this->assertDatabaseHas('insurances', [
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
        ]);

        // Verify premium calculation (2% of rent)
        $insurance = Insurance::where('contrat_id', $this->contract->id)->first();
        $this->assertEquals(100000, $insurance->prime_mensuelle_gnf); // 2% of 5M
    }

    /** @test */
    public function landlord_can_subscribe_to_loyer_garanti_insurance(): void
    {
        $response = $this->actingAs($this->landlord)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'LOYER_GARANTI',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('insurances', [
            'utilisateur_id' => $this->landlord->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'LOYER_GARANTI',
            'statut' => 'ACTIVE',
        ]);
    }

    /** @test */
    public function insurance_subscription_requires_valid_contract(): void
    {
        $response = $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => 'invalid-uuid',
                'type_assurance' => 'SEJOUR_SEREIN',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contrat_id']);
    }

    /** @test */
    public function insurance_subscription_requires_valid_type(): void
    {
        $response = $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'INVALID_TYPE',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type_assurance']);
    }

    /** @test */
    public function sejour_serein_has_correct_coverages(): void
    {
        $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'SEJOUR_SEREIN',
            ]);

        $insurance = Insurance::where('contrat_id', $this->contract->id)->first();

        $this->assertTrue($insurance->couvertures['expulsion_abusive']);
        $this->assertTrue($insurance->couvertures['caution']);
        $this->assertTrue($insurance->couvertures['assistance_juridique']);
    }

    /** @test */
    public function loyer_garanti_has_correct_coverages(): void
    {
        $this->actingAs($this->landlord)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'LOYER_GARANTI',
            ]);

        $insurance = Insurance::where('contrat_id', $this->contract->id)->first();

        $this->assertTrue($insurance->couvertures['impayes']);
        $this->assertTrue($insurance->couvertures['degats_locatifs']);
    }

    /** @test */
    public function insurance_generates_unique_policy_number(): void
    {
        $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'SEJOUR_SEREIN',
            ]);

        $insurance = Insurance::where('contrat_id', $this->contract->id)->first();

        $this->assertStringStartsWith('ASSUR-SS-', $insurance->numero_police);
    }

    /** @test */
    public function insurance_expires_after_one_year(): void
    {
        $this->actingAs($this->tenant)
            ->postJson('/api/insurances/subscribe', [
                'contrat_id' => $this->contract->id,
                'type_assurance' => 'SEJOUR_SEREIN',
            ]);

        $insurance = Insurance::where('contrat_id', $this->contract->id)->first();

        $this->assertEquals(
            now()->addYear()->format('Y-m-d'),
            $insurance->date_expiration->format('Y-m-d')
        );
    }

    // ==================== MY INSURANCES TESTS ====================

    /** @test */
    public function user_can_list_their_insurances(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
        ]);

        $response = $this->actingAs($this->tenant)
            ->getJson('/api/insurances/me');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function user_can_view_single_insurance(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
        ]);

        $response = $this->actingAs($this->tenant)
            ->getJson("/api/insurances/{$insurance->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $insurance->id,
                ],
            ]);
    }

    /** @test */
    public function user_cannot_view_others_insurance(): void
    {
        $otherUser = User::factory()->create();
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $otherUser->id,
            'contrat_id' => $this->contract->id,
        ]);

        $response = $this->actingAs($this->tenant)
            ->getJson("/api/insurances/{$insurance->id}");

        $response->assertStatus(403);
    }

    // ==================== CLAIM TESTS ====================

    /** @test */
    public function tenant_can_submit_expulsion_claim(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subDays(60), // Past carence period
            'couvertures' => [
                'expulsion_abusive' => true,
                'caution' => true,
                'assistance_juridique' => true,
            ],
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/claim", [
                'type_claim' => 'expulsion',
                'description' => str_repeat('Description détaillée du sinistre. ', 10), // 100+ chars
                'montant_reclame_gnf' => 15000000,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Claim submitted successfully. You will be contacted within 48 hours.',
            ]);
    }

    /** @test */
    public function claim_requires_minimum_description_length(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subDays(60),
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/claim", [
                'type_claim' => 'expulsion',
                'description' => 'Too short',
                'montant_reclame_gnf' => 15000000,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    /** @test */
    public function claim_eligibility_check_returns_eligible_for_active_insurance(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subDays(60),
            'date_expiration' => now()->addMonths(10),
            'couvertures' => [
                'expulsion_abusive' => true,
                'caution' => true,
                'assistance_juridique' => true,
            ],
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/check-eligibility", [
                'type_claim' => 'expulsion',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'eligible' => true,
                'reasons' => [],
            ]);
    }

    /** @test */
    public function claim_eligibility_fails_during_carence_period(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subDays(10), // Within 30-day carence
            'date_expiration' => now()->addYear(),
            'couvertures' => [
                'expulsion_abusive' => true,
            ],
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/check-eligibility", [
                'type_claim' => 'expulsion',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'eligible' => false,
            ]);

        $this->assertStringContainsString('carence', $response->json('reasons.0'));
    }

    /** @test */
    public function claim_eligibility_fails_for_expired_insurance(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subYears(2),
            'date_expiration' => now()->subDays(10), // Expired
            'couvertures' => [
                'expulsion_abusive' => true,
            ],
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/check-eligibility", [
                'type_claim' => 'expulsion',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'eligible' => false,
            ]);

        $this->assertStringContainsString('expiré', $response->json('reasons.0'));
    }

    /** @test */
    public function claim_eligibility_fails_for_uncovered_claim_type(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
            'statut' => 'ACTIVE',
            'date_souscription' => now()->subDays(60),
            'date_expiration' => now()->addMonths(10),
            'couvertures' => [
                'expulsion_abusive' => false, // Not covered
                'caution' => true,
            ],
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/check-eligibility", [
                'type_claim' => 'expulsion',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'eligible' => false,
            ]);

        $this->assertStringContainsString('pas couvert', $response->json('reasons.0'));
    }

    // ==================== CANCELLATION TESTS ====================

    /** @test */
    public function user_can_cancel_their_insurance(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'statut' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/cancel");

        $response->assertStatus(200);

        $this->assertDatabaseHas('insurances', [
            'id' => $insurance->id,
            'statut' => 'RESILIEE',
        ]);
    }

    /** @test */
    public function user_cannot_cancel_others_insurance(): void
    {
        $otherUser = User::factory()->create();
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $otherUser->id,
            'contrat_id' => $this->contract->id,
            'statut' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->tenant)
            ->postJson("/api/insurances/{$insurance->id}/cancel");

        $response->assertStatus(403);
    }

    // ==================== CERTIFICATE TESTS ====================

    /** @test */
    public function user_can_download_insurance_certificate(): void
    {
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $this->tenant->id,
            'contrat_id' => $this->contract->id,
            'statut' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->tenant)
            ->get("/api/insurances/{$insurance->id}/certificate");

        $response->assertStatus(200)
            ->assertHeader('content-type', 'application/pdf');
    }

    /** @test */
    public function user_cannot_download_others_certificate(): void
    {
        $otherUser = User::factory()->create();
        $insurance = Insurance::factory()->create([
            'utilisateur_id' => $otherUser->id,
            'contrat_id' => $this->contract->id,
        ]);

        $response = $this->actingAs($this->tenant)
            ->get("/api/insurances/{$insurance->id}/certificate");

        $response->assertStatus(403);
    }

    // ==================== VALIDATION TESTS ====================

    /** @test */
    public function insurance_subscription_requires_authentication(): void
    {
        $response = $this->postJson('/api/insurances/subscribe', [
            'contrat_id' => $this->contract->id,
            'type_assurance' => 'SEJOUR_SEREIN',
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function my_insurances_requires_authentication(): void
    {
        $response = $this->getJson('/api/insurances/me');

        $response->assertStatus(401);
    }
}
