<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Listing;
use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Tests\TestCase;

class ContractGenerationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $proprietaire;
    protected User $locataire;
    protected Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->proprietaire = User::factory()->create([
            'type_compte' => 'proprietaire',
        ]);

        $this->locataire = User::factory()->create([
            'type_compte' => 'locataire',
        ]);

        // Create listing
        $this->listing = Listing::factory()->create([
            'proprietaire_id' => $this->proprietaire->id,
            'type_bien' => 'appartement',
            'statut' => 'publiee',
            'prix' => 2500000, // 2,500,000 GNF
        ]);

        // Configure fake storage
        Storage::fake('s3');
    }

    /**
     * Test contract creation with valid data.
     */
    public function test_can_create_contract_with_valid_data(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
            'donnees_personnalisees' => [
                'caution_mois' => 1,
                'avance_mois' => 3,
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Contrat créé avec succès',
            ])
            ->assertJsonStructure([
                'data' => [
                    'contract' => [
                        'id',
                        'reference',
                        'type_contrat',
                        'loyer_mensuel',
                        'statut',
                        'listing',
                        'proprietaire',
                        'locataire',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('contracts', [
            'listing_id' => $this->listing->id,
            'locataire_id' => $this->locataire->id,
            'proprietaire_id' => $this->proprietaire->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'statut' => 'en_attente_signature',
        ]);
    }

    /**
     * Test contract creation fails for unavailable listing.
     */
    public function test_cannot_create_contract_for_unavailable_listing(): void
    {
        Passport::actingAs($this->locataire);

        // Mark listing as unavailable
        $this->listing->update(['statut' => 'archivee']);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Cette annonce n\'est plus disponible',
            ]);
    }

    /**
     * Test contract requires authentication.
     */
    public function test_contract_creation_requires_authentication(): void
    {
        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test fetching user contracts.
     */
    public function test_can_fetch_user_contracts(): void
    {
        Passport::actingAs($this->locataire);

        // Create a contract
        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
        ]);

        $response = $this->getJson('/api/contracts');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'contracts',
                ],
            ]);
    }

    /**
     * Test fetching single contract.
     */
    public function test_can_fetch_single_contract(): void
    {
        Passport::actingAs($this->locataire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
        ]);

        $response = $this->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test cannot fetch contract not belonging to user.
     */
    public function test_cannot_fetch_contract_not_belonging_to_user(): void
    {
        $otherUser = User::factory()->create();
        Passport::actingAs($otherUser);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
        ]);

        $response = $this->getJson("/api/contracts/{$contract->id}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Non autorisé',
            ]);
    }

    /**
     * Test PDF preview endpoint.
     */
    public function test_can_preview_contract_pdf(): void
    {
        Passport::actingAs($this->locataire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'fichier_pdf_url' => 'contracts/test.pdf',
        ]);

        // Mock the PDF file in storage
        Storage::disk('s3')->put('contracts/test.pdf', '%PDF-1.4 test content');

        $response = $this->get("/api/contracts/{$contract->id}/preview");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
    }

    /**
     * Test contract deletion when not signed.
     */
    public function test_proprietaire_can_delete_unsigned_contract(): void
    {
        Passport::actingAs($this->proprietaire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'statut' => 'en_attente_signature',
        ]);

        $response = $this->deleteJson("/api/contracts/{$contract->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Contrat supprimé avec succès',
            ]);

        $this->assertDatabaseMissing('contracts', ['id' => $contract->id]);
    }

    /**
     * Test cannot delete signed contract.
     */
    public function test_cannot_delete_signed_contract(): void
    {
        Passport::actingAs($this->proprietaire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'statut' => 'signe',
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
        ]);

        $response = $this->deleteJson("/api/contracts/{$contract->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Impossible de supprimer un contrat signé',
            ]);
    }

    /**
     * Test locataire cannot delete contract.
     */
    public function test_locataire_cannot_delete_contract(): void
    {
        Passport::actingAs($this->locataire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'statut' => 'en_attente_signature',
        ]);

        $response = $this->deleteJson("/api/contracts/{$contract->id}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Seul le propriétaire peut supprimer le contrat',
            ]);
    }

    /**
     * Test sending contract for signature.
     */
    public function test_can_send_contract_for_signature(): void
    {
        Passport::actingAs($this->proprietaire);

        $contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'statut' => 'brouillon',
        ]);

        $response = $this->postJson("/api/contracts/{$contract->id}/send", [
            'message' => 'Veuillez signer ce contrat.',
            'channels' => ['email', 'sms'],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Contrat envoyé pour signature',
            ]);

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'statut' => 'en_attente_signature',
        ]);
    }

    /**
     * Test contract types validation.
     */
    public function test_validates_contract_type(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'INVALID_TYPE',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test contract reference is generated correctly.
     */
    public function test_contract_reference_is_generated(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
        ]);

        $response->assertStatus(201);

        $contract = Contract::latest()->first();
        $this->assertStringStartsWith('CTR-', $contract->reference);
    }

    /**
     * Test contract conditions are generated.
     */
    public function test_contract_conditions_are_generated(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
        ]);

        $response->assertStatus(201);

        $contract = Contract::latest()->first();
        $this->assertIsArray($contract->conditions_generales);
        $this->assertNotEmpty($contract->conditions_generales);
    }

    /**
     * Test commercial lease contract type.
     */
    public function test_can_create_commercial_lease_contract(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'BAIL_LOCATION_COMMERCIAL',
            'loyer_mensuel' => 5000000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYears(3)->format('Y-m-d'),
            'donnees_personnalisees' => [
                'activite_commerciale' => 'Restaurant',
                'caution_mois' => 3,
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test land sale promise contract type.
     */
    public function test_can_create_land_sale_promise_contract(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'PROMESSE_VENTE_TERRAIN',
            'loyer_mensuel' => 0,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addMonths(3)->format('Y-m-d'),
            'donnees_personnalisees' => [
                'prix_vente' => 150000000,
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test management mandate contract type.
     */
    public function test_can_create_management_mandate_contract(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/contracts', [
            'listing_id' => $this->listing->id,
            'type_contrat' => 'MANDAT_GESTION',
            'loyer_mensuel' => 2500000,
            'date_debut' => now()->format('Y-m-d'),
            'date_fin' => now()->addYear()->format('Y-m-d'),
            'donnees_personnalisees' => [
                'commission_pourcentage' => 8,
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);
    }
}
