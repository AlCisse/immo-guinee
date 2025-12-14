<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Listing;
use App\Models\Rating;
use App\Models\User;
use App\Services\ContentModerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Mockery;
use Tests\TestCase;

/**
 * T218: Feature tests for Ratings (FR-067 to FR-071)
 */
class RatingTest extends TestCase
{
    use RefreshDatabase;

    protected User $bailleur;
    protected User $locataire;
    protected Contract $contract;
    protected Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test users
        $this->bailleur = User::factory()->create([
            'type_compte' => 'PARTICULIER',
            'badge' => 'ARGENT',
            'is_active' => true,
        ]);

        $this->locataire = User::factory()->create([
            'type_compte' => 'PARTICULIER',
            'badge' => 'BRONZE',
            'is_active' => true,
        ]);

        // Create listing
        $this->listing = Listing::factory()->create([
            'user_id' => $this->bailleur->id,
        ]);

        // Create contract
        $this->contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'bailleur_id' => $this->bailleur->id,
            'locataire_id' => $this->locataire->id,
            'statut' => 'TERMINE',
        ]);
    }

    /**
     * Test: Tenant can create a rating for completed contract (FR-067)
     */
    public function test_tenant_can_create_rating_for_completed_contract(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 4,
            'note_communication' => 5,
            'note_ponctualite' => 4,
            'note_proprete' => 4,
            'note_respect_contrat' => 3,
            'commentaire' => 'Très bon propriétaire, bien entretenu et communication excellente. Je recommande vivement.',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'note',
                    'commentaire',
                    'is_published',
                ],
            ]);

        $this->assertDatabaseHas('ratings', [
            'contract_id' => $this->contract->id,
            'evaluateur_id' => $this->locataire->id,
            'evalue_id' => $this->bailleur->id,
            'note' => 4,
        ]);
    }

    /**
     * Test: Landlord can create a rating for tenant (FR-067)
     */
    public function test_landlord_can_rate_tenant_after_contract(): void
    {
        Passport::actingAs($this->bailleur);

        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 5,
            'note_communication' => 5,
            'note_ponctualite' => 5,
            'note_proprete' => 5,
            'note_respect_contrat' => 5,
            'commentaire' => 'Excellent locataire, toujours ponctuel dans les paiements et respectueux du logement.',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('ratings', [
            'contract_id' => $this->contract->id,
            'evaluateur_id' => $this->bailleur->id,
            'evalue_id' => $this->locataire->id,
        ]);
    }

    /**
     * Test: Rating requires minimum comment length (FR-067)
     */
    public function test_rating_requires_minimum_comment_length(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 4,
            'note_communication' => 4,
            'note_ponctualite' => 4,
            'note_proprete' => 4,
            'note_respect_contrat' => 4,
            'commentaire' => 'Trop court',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['commentaire']);
    }

    /**
     * Test: Cannot rate same contract twice (FR-067)
     */
    public function test_cannot_rate_same_contract_twice(): void
    {
        Passport::actingAs($this->locataire);

        // First rating
        Rating::factory()->create([
            'contract_id' => $this->contract->id,
            'evaluateur_id' => $this->locataire->id,
            'evalue_id' => $this->bailleur->id,
        ]);

        // Second attempt
        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 3,
            'note_communication' => 3,
            'note_ponctualite' => 3,
            'note_proprete' => 3,
            'note_respect_contrat' => 3,
            'commentaire' => 'Cette fois je change mon avis mais je ne devrais pas pouvoir.',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Rating criteria must be 1-5 (FR-068)
     */
    public function test_rating_criteria_must_be_1_to_5(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 6, // Invalid
            'note_communication' => 0, // Invalid
            'note_ponctualite' => 4,
            'note_proprete' => 4,
            'note_respect_contrat' => 4,
            'commentaire' => 'Ce commentaire est assez long pour passer la validation minimum.',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['note', 'note_communication']);
    }

    /**
     * Test: Content moderation flags inappropriate content (FR-069)
     */
    public function test_content_moderation_flags_inappropriate_content(): void
    {
        // Mock the moderation service
        $this->mock(ContentModerationService::class, function ($mock) {
            $mock->shouldReceive('moderate')
                ->once()
                ->andReturn([
                    'is_approved' => false,
                    'status' => 'FLAGGED',
                    'detected_keywords' => ['mot_interdit'],
                    'reason' => 'Contenu potentiellement inapproprié',
                ]);
        });

        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/ratings', [
            'contract_id' => $this->contract->id,
            'note' => 1,
            'note_communication' => 1,
            'note_ponctualite' => 1,
            'note_proprete' => 1,
            'note_respect_contrat' => 1,
            'commentaire' => 'Ce propriétaire est un mot_interdit qui ne mérite pas mon argent!',
        ]);

        $response->assertStatus(201);

        // Rating should be created but not published
        $rating = Rating::where('contract_id', $this->contract->id)->first();
        $this->assertFalse($rating->is_published);
        $this->assertTrue($rating->is_flagged);
    }

    /**
     * Test: Get user ratings with stats (FR-070)
     */
    public function test_get_user_ratings_with_stats(): void
    {
        // Create multiple ratings for the bailleur
        Rating::factory()->count(5)->create([
            'evalue_id' => $this->bailleur->id,
            'is_published' => true,
        ]);

        $response = $this->getJson("/api/users/{$this->bailleur->id}/ratings");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'note',
                        'commentaire',
                        'evaluateur',
                    ],
                ],
            ]);
    }

    /**
     * Test: Get user rating statistics (FR-070)
     */
    public function test_get_user_rating_statistics(): void
    {
        // Create ratings with various scores
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 5,
            'note_communication' => 5,
            'is_published' => true,
        ]);

        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 4,
            'note_communication' => 4,
            'is_published' => true,
        ]);

        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 3,
            'note_communication' => 3,
            'is_published' => true,
        ]);

        $response = $this->getJson("/api/users/{$this->bailleur->id}/ratings/stats");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'average',
                    'total',
                    'distribution',
                    'criteria',
                ],
            ]);

        $stats = $response->json('data');
        $this->assertEquals(3, $stats['total']);
        $this->assertEquals(4.0, $stats['average']);
    }

    /**
     * Test: Average rating updates automatically (FR-071)
     */
    public function test_average_rating_updates_automatically(): void
    {
        Passport::actingAs($this->locataire);

        // Create first rating
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 5,
            'is_published' => true,
        ]);

        // Trigger average recalculation
        $this->artisan('immog:update-average-ratings', ['--user' => $this->bailleur->id])
            ->assertExitCode(0);

        $this->bailleur->refresh();
        $this->assertEquals(5.0, $this->bailleur->avg_rating);

        // Add another rating
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 3,
            'is_published' => true,
        ]);

        // Trigger average recalculation again
        $this->artisan('immog:update-average-ratings', ['--user' => $this->bailleur->id])
            ->assertExitCode(0);

        $this->bailleur->refresh();
        $this->assertEquals(4.0, $this->bailleur->avg_rating);
    }

    /**
     * Test: Unpublished ratings don't affect average (FR-071)
     */
    public function test_unpublished_ratings_dont_affect_average(): void
    {
        // Published rating
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 5,
            'is_published' => true,
        ]);

        // Unpublished (flagged) rating
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 1,
            'is_published' => false,
            'is_flagged' => true,
        ]);

        $this->artisan('immog:update-average-ratings', ['--user' => $this->bailleur->id])
            ->assertExitCode(0);

        $this->bailleur->refresh();
        // Should only count the published rating
        $this->assertEquals(5.0, $this->bailleur->avg_rating);
    }

    /**
     * Test: Reply to rating (FR-070)
     */
    public function test_owner_can_reply_to_rating(): void
    {
        $rating = Rating::factory()->create([
            'contract_id' => $this->contract->id,
            'evaluateur_id' => $this->locataire->id,
            'evalue_id' => $this->bailleur->id,
            'is_published' => true,
        ]);

        Passport::actingAs($this->bailleur);

        $response = $this->postJson("/api/ratings/{$rating->id}/reply", [
            'reponse' => 'Merci pour votre retour. Je suis ravi que votre séjour se soit bien passé.',
        ]);

        $response->assertStatus(200);

        $rating->refresh();
        $this->assertNotNull($rating->reponse);
        $this->assertNotNull($rating->reponse_at);
    }

    /**
     * Test: Only evaluated user can reply (FR-070)
     */
    public function test_only_evaluated_user_can_reply(): void
    {
        $rating = Rating::factory()->create([
            'contract_id' => $this->contract->id,
            'evaluateur_id' => $this->locataire->id,
            'evalue_id' => $this->bailleur->id,
            'is_published' => true,
        ]);

        // Try to reply as the evaluator (not allowed)
        Passport::actingAs($this->locataire);

        $response = $this->postJson("/api/ratings/{$rating->id}/reply", [
            'reponse' => 'Je ne devrais pas pouvoir répondre à mon propre avis.',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Mark rating as helpful
     */
    public function test_user_can_mark_rating_as_helpful(): void
    {
        $rating = Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'is_published' => true,
            'helpful_count' => 0,
        ]);

        $otherUser = User::factory()->create();
        Passport::actingAs($otherUser);

        $response = $this->postJson("/api/ratings/{$rating->id}/helpful");

        $response->assertStatus(200);

        $rating->refresh();
        $this->assertEquals(1, $rating->helpful_count);
    }

    /**
     * Test: Report inappropriate rating
     */
    public function test_user_can_report_inappropriate_rating(): void
    {
        $rating = Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'is_published' => true,
        ]);

        $reporter = User::factory()->create();
        Passport::actingAs($reporter);

        $response = $this->postJson("/api/ratings/{$rating->id}/report", [
            'reason' => 'Contenu inapproprié',
        ]);

        $response->assertStatus(200);
    }

    /**
     * Test: Admin can moderate ratings (FR-069)
     */
    public function test_admin_can_moderate_flagged_ratings(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rating = Rating::factory()->create([
            'is_published' => false,
            'is_flagged' => true,
        ]);

        Passport::actingAs($admin);

        // Approve the rating
        $response = $this->putJson("/api/admin/ratings/{$rating->id}/moderate", [
            'action' => 'approve',
        ]);

        $response->assertStatus(200);

        $rating->refresh();
        $this->assertTrue($rating->is_published);
        $this->assertFalse($rating->is_flagged);
    }

    /**
     * Test: Admin can reject flagged ratings (FR-069)
     */
    public function test_admin_can_reject_flagged_ratings(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rating = Rating::factory()->create([
            'is_published' => false,
            'is_flagged' => true,
        ]);

        Passport::actingAs($admin);

        $response = $this->putJson("/api/admin/ratings/{$rating->id}/moderate", [
            'action' => 'reject',
            'reason' => 'Violation des conditions d\'utilisation',
        ]);

        $response->assertStatus(200);

        $rating->refresh();
        $this->assertFalse($rating->is_published);
        $this->assertTrue($rating->is_flagged);
    }

    /**
     * Test: Dry-run mode for average ratings update
     */
    public function test_dry_run_mode_does_not_modify_data(): void
    {
        Rating::factory()->create([
            'evalue_id' => $this->bailleur->id,
            'note' => 5,
            'is_published' => true,
        ]);

        $originalRating = $this->bailleur->avg_rating;

        $this->artisan('immog:update-average-ratings', ['--dry-run' => true])
            ->assertExitCode(0);

        $this->bailleur->refresh();
        $this->assertEquals($originalRating, $this->bailleur->avg_rating);
    }
}
