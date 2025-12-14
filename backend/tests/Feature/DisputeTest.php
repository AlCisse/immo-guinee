<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Dispute;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * T219: Feature tests for Disputes (FR-072 to FR-074)
 */
class DisputeTest extends TestCase
{
    use RefreshDatabase;

    protected User $plaignant;
    protected User $defendeur;
    protected User $mediateur;
    protected User $admin;
    protected Contract $contract;
    protected Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles
        Role::findOrCreate('admin');
        Role::findOrCreate('mediator');

        // Create test users
        $this->plaignant = User::factory()->create([
            'type_compte' => 'PARTICULIER',
            'badge' => 'BRONZE',
            'is_active' => true,
        ]);

        $this->defendeur = User::factory()->create([
            'type_compte' => 'PARTICULIER',
            'badge' => 'ARGENT',
            'is_active' => true,
        ]);

        $this->mediateur = User::factory()->create([
            'type_compte' => 'PARTICULIER',
            'badge' => 'OR',
            'is_active' => true,
        ]);
        $this->mediateur->assignRole('mediator');

        $this->admin = User::factory()->create([
            'is_active' => true,
        ]);
        $this->admin->assignRole('admin');

        // Create listing
        $this->listing = Listing::factory()->create([
            'user_id' => $this->defendeur->id,
        ]);

        // Create contract
        $this->contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'bailleur_id' => $this->defendeur->id,
            'locataire_id' => $this->plaignant->id,
            'statut' => 'ACTIF',
        ]);

        // Fake storage
        Storage::fake('s3');
    }

    /**
     * Test: User can create a dispute (FR-072)
     */
    public function test_user_can_create_dispute(): void
    {
        Passport::actingAs($this->plaignant);

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Loyers impayés depuis 3 mois',
            'categorie' => 'IMPAYE',
            'description' => str_repeat('Description détaillée du litige avec tous les faits, dates et montants concernés. ', 10),
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'reference_litige',
                    'statut',
                    'categorie',
                    'plaignant',
                    'defendeur',
                ],
            ]);

        $this->assertDatabaseHas('disputes', [
            'contract_id' => $this->contract->id,
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'categorie' => 'IMPAYE',
            'statut' => 'OUVERT',
        ]);
    }

    /**
     * Test: Dispute requires minimum description length (FR-072)
     */
    public function test_dispute_requires_minimum_description_length(): void
    {
        Passport::actingAs($this->plaignant);

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Problème de loyer',
            'categorie' => 'IMPAYE',
            'description' => 'Trop court',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    /**
     * Test: Dispute with file uploads (FR-072)
     */
    public function test_dispute_with_file_uploads(): void
    {
        Passport::actingAs($this->plaignant);

        $file1 = UploadedFile::fake()->image('preuve1.jpg', 800, 600);
        $file2 = UploadedFile::fake()->create('contrat.pdf', 1000, 'application/pdf');

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Dégâts non réparés',
            'categorie' => 'DEGATS',
            'description' => str_repeat('Description détaillée des dégâts constatés dans le logement avec photos à l\'appui. ', 10),
            'preuves' => [$file1, $file2],
        ]);

        $response->assertStatus(201);

        $dispute = Dispute::where('contract_id', $this->contract->id)->first();
        $this->assertNotEmpty($dispute->preuves);
        $this->assertCount(2, $dispute->preuves);
    }

    /**
     * Test: Invalid file type rejected (FR-072)
     */
    public function test_invalid_file_type_rejected(): void
    {
        Passport::actingAs($this->plaignant);

        $file = UploadedFile::fake()->create('malware.exe', 1000, 'application/x-msdownload');

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Test avec fichier invalide',
            'categorie' => 'AUTRE',
            'description' => str_repeat('Description détaillée pour le test. ', 10),
            'preuves' => [$file],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['preuves.0']);
    }

    /**
     * Test: Get user's disputes
     */
    public function test_get_user_disputes(): void
    {
        // Create disputes for the user
        Dispute::factory()->count(3)->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
        ]);

        Passport::actingAs($this->plaignant);

        $response = $this->getJson('/api/disputes');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    /**
     * Test: Get single dispute details
     */
    public function test_get_dispute_details(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
        ]);

        Passport::actingAs($this->plaignant);

        $response = $this->getJson("/api/disputes/{$dispute->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'reference_litige',
                    'motif',
                    'description',
                    'categorie',
                    'statut',
                    'preuves',
                    'plaignant',
                    'defendeur',
                    'mediateur',
                    'contract',
                ],
            ]);
    }

    /**
     * Test: Unauthorized user cannot view dispute
     */
    public function test_unauthorized_user_cannot_view_dispute(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
        ]);

        // Create a random user who is not involved
        $randomUser = User::factory()->create();
        Passport::actingAs($randomUser);

        $response = $this->getJson("/api/disputes/{$dispute->id}");

        $response->assertStatus(403);
    }

    /**
     * Test: Admin can assign mediator (FR-073)
     */
    public function test_admin_can_assign_mediator(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
        ]);

        Passport::actingAs($this->admin);

        $response = $this->postJson("/api/admin/disputes/{$dispute->id}/assign-mediator", [
            'mediateur_id' => $this->mediateur->id,
        ]);

        $response->assertStatus(200);

        $dispute->refresh();
        $this->assertEquals($this->mediateur->id, $dispute->mediateur_id);
        $this->assertEquals('EN_MEDIATION', $dispute->statut);
        $this->assertNotNull($dispute->mediation_started_at);
    }

    /**
     * Test: Auto-assign mediator command (FR-073)
     */
    public function test_auto_assign_mediator_command(): void
    {
        // Create dispute more than 24h ago without mediator
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
            'created_at' => now()->subHours(25),
        ]);

        $this->artisan('immog:assign-mediators')
            ->assertExitCode(0);

        $dispute->refresh();
        $this->assertEquals($this->mediateur->id, $dispute->mediateur_id);
        $this->assertEquals('EN_MEDIATION', $dispute->statut);
    }

    /**
     * Test: Auto-assign respects 24h delay
     */
    public function test_auto_assign_respects_delay(): void
    {
        // Create dispute less than 24h ago
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
            'created_at' => now()->subHours(12),
        ]);

        $this->artisan('immog:assign-mediators')
            ->assertExitCode(0);

        $dispute->refresh();
        $this->assertNull($dispute->mediateur_id);
        $this->assertEquals('OUVERT', $dispute->statut);
    }

    /**
     * Test: Force flag bypasses delay
     */
    public function test_force_flag_bypasses_delay(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
            'created_at' => now()->subHours(1),
        ]);

        $this->artisan('immog:assign-mediators', ['--force' => true])
            ->assertExitCode(0);

        $dispute->refresh();
        $this->assertEquals($this->mediateur->id, $dispute->mediateur_id);
    }

    /**
     * Test: Mediator cannot be party to dispute
     */
    public function test_mediator_cannot_be_party_to_dispute(): void
    {
        // Make the only mediator the defendant
        $this->mediateur->assignRole('mediator');

        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->mediateur->id, // Mediator is the defendant
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
            'created_at' => now()->subHours(25),
        ]);

        // Create another mediator
        $anotherMediator = User::factory()->create(['is_active' => true]);
        $anotherMediator->assignRole('mediator');

        $this->artisan('immog:assign-mediators')
            ->assertExitCode(0);

        $dispute->refresh();
        // Should assign the other mediator, not the one who is a party
        $this->assertEquals($anotherMediator->id, $dispute->mediateur_id);
    }

    /**
     * Test: Mediator can resolve dispute amicably (FR-074)
     */
    public function test_mediator_can_resolve_dispute_amicably(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'EN_MEDIATION',
            'mediateur_id' => $this->mediateur->id,
        ]);

        Passport::actingAs($this->mediateur);

        $response = $this->postJson("/api/disputes/{$dispute->id}/resolve", [
            'resolution' => 'AMIABLE',
            'notes' => 'Les deux parties ont trouvé un accord. Le propriétaire s\'engage à effectuer les réparations sous 15 jours.',
        ]);

        $response->assertStatus(200);

        $dispute->refresh();
        $this->assertEquals('RESOLU_AMIABLE', $dispute->statut);
        $this->assertNotNull($dispute->resolved_at);
        $this->assertTrue($dispute->is_closed);
    }

    /**
     * Test: Mediator can resolve with compensation (FR-074)
     */
    public function test_mediator_can_resolve_with_compensation(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'EN_MEDIATION',
            'mediateur_id' => $this->mediateur->id,
        ]);

        Passport::actingAs($this->mediateur);

        $response = $this->postJson("/api/disputes/{$dispute->id}/resolve", [
            'resolution' => 'COMPENSATION',
            'montant_resolution' => 500000,
            'notes' => 'Le défendeur accepte de verser une compensation de 500,000 GNF au plaignant.',
        ]);

        $response->assertStatus(200);

        $dispute->refresh();
        $this->assertEquals('RESOLU_AMIABLE', $dispute->statut);
        $this->assertEquals(500000, $dispute->montant_resolution);
    }

    /**
     * Test: Mediator can escalate dispute (FR-074)
     */
    public function test_mediator_can_escalate_dispute(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'EN_MEDIATION',
            'mediateur_id' => $this->mediateur->id,
        ]);

        Passport::actingAs($this->mediateur);

        $response = $this->postJson("/api/disputes/{$dispute->id}/escalate", [
            'reason' => 'Les parties ne parviennent pas à un accord. Recommandation de recours judiciaire.',
        ]);

        $response->assertStatus(200);

        $dispute->refresh();
        $this->assertEquals('ESCALADE', $dispute->statut);
        $this->assertTrue($dispute->escalated_to_legal);
        $this->assertNotNull($dispute->legal_escalation_at);
    }

    /**
     * Test: Only assigned mediator can resolve
     */
    public function test_only_assigned_mediator_can_resolve(): void
    {
        $anotherMediator = User::factory()->create(['is_active' => true]);
        $anotherMediator->assignRole('mediator');

        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'EN_MEDIATION',
            'mediateur_id' => $this->mediateur->id,
        ]);

        Passport::actingAs($anotherMediator);

        $response = $this->postJson("/api/disputes/{$dispute->id}/resolve", [
            'resolution' => 'AMIABLE',
            'notes' => 'Tentative de résolution non autorisée.',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Party can send message in dispute
     */
    public function test_party_can_send_message_in_dispute(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'EN_MEDIATION',
            'mediateur_id' => $this->mediateur->id,
        ]);

        Passport::actingAs($this->plaignant);

        $response = $this->postJson("/api/disputes/{$dispute->id}/messages", [
            'content' => 'Je souhaite fournir des informations supplémentaires sur ce litige.',
        ]);

        $response->assertStatus(201);
    }

    /**
     * Test: Dispute affects badge (badge downgrade check)
     */
    public function test_dispute_affects_badge_consideration(): void
    {
        // Create multiple disputes against the defendant
        for ($i = 0; $i < 4; $i++) {
            Dispute::factory()->create([
                'plaignant_id' => $this->plaignant->id,
                'defendeur_id' => $this->defendeur->id,
                'contract_id' => $this->contract->id,
                'statut' => 'RESOLU_AMIABLE',
                'affects_defendeur_badge' => true,
            ]);
        }

        // Run badge downgrade check
        $this->artisan('immog:check-badge-downgrades')
            ->assertExitCode(0);

        $this->defendeur->refresh();
        // With 4 disputes, user should be downgraded from ARGENT to BRONZE
        $this->assertEquals('BRONZE', $this->defendeur->badge);
    }

    /**
     * Test: Dry-run mode for mediator assignment
     */
    public function test_dry_run_mode_does_not_assign(): void
    {
        $dispute = Dispute::factory()->create([
            'plaignant_id' => $this->plaignant->id,
            'defendeur_id' => $this->defendeur->id,
            'contract_id' => $this->contract->id,
            'statut' => 'OUVERT',
            'mediateur_id' => null,
            'created_at' => now()->subHours(25),
        ]);

        $this->artisan('immog:assign-mediators', ['--dry-run' => true])
            ->assertExitCode(0);

        $dispute->refresh();
        $this->assertNull($dispute->mediateur_id);
        $this->assertEquals('OUVERT', $dispute->statut);
    }

    /**
     * Test: Dispute categories are validated
     */
    public function test_dispute_categories_validated(): void
    {
        Passport::actingAs($this->plaignant);

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Test de catégorie invalide',
            'categorie' => 'INVALID_CATEGORY',
            'description' => str_repeat('Description détaillée pour le test. ', 10),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['categorie']);
    }

    /**
     * Test: Cannot create dispute for non-existent contract
     */
    public function test_cannot_create_dispute_for_nonexistent_contract(): void
    {
        Passport::actingAs($this->plaignant);

        $response = $this->postJson('/api/disputes', [
            'contract_id' => '00000000-0000-0000-0000-000000000000',
            'motif' => 'Litige pour contrat inexistant',
            'categorie' => 'AUTRE',
            'description' => str_repeat('Description détaillée pour le test. ', 10),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contract_id']);
    }

    /**
     * Test: Reference is auto-generated
     */
    public function test_dispute_reference_auto_generated(): void
    {
        Passport::actingAs($this->plaignant);

        $response = $this->postJson('/api/disputes', [
            'contract_id' => $this->contract->id,
            'motif' => 'Test de génération de référence',
            'categorie' => 'AUTRE',
            'description' => str_repeat('Description détaillée pour le test de référence. ', 10),
        ]);

        $response->assertStatus(201);

        $dispute = Dispute::where('contract_id', $this->contract->id)->first();
        $this->assertNotNull($dispute->reference_litige);
        $this->assertStringStartsWith('LIT-', $dispute->reference_litige);
    }
}
