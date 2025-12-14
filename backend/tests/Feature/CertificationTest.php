<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\CertificationDocument;
use App\Services\CertificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * T180 [US5] PHPUnit Feature Tests for Certification Flow
 *
 * Tests badge upgrades/downgrades, document verification, and progression tracking
 * as per FR-053 to FR-058.
 */
class CertificationTest extends TestCase
{
    use RefreshDatabase;

    private CertificationService $certificationService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->certificationService = app(CertificationService::class);
        Storage::fake('public');
    }

    // ==========================================
    // Badge Level Tests (FR-053)
    // ==========================================

    /** @test */
    public function new_user_starts_with_bronze_badge(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
        ]);

        $this->assertEquals('BRONZE', $user->badge_certification);
    }

    /** @test */
    public function user_upgrades_to_argent_with_cni_and_one_transaction(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 1,
            'note_moyenne' => 4.0,
            'nombre_litiges' => 0,
        ]);

        $newBadge = $this->certificationService->calculateBadgeUpgrade($user);

        $this->assertEquals('ARGENT', $newBadge);
        $this->assertEquals('ARGENT', $user->fresh()->badge_certification);
    }

    /** @test */
    public function user_upgrades_to_or_with_five_transactions(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'ARGENT',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 5,
            'note_moyenne' => 4.2,
            'nombre_litiges' => 0,
        ]);

        $newBadge = $this->certificationService->calculateBadgeUpgrade($user);

        $this->assertEquals('OR', $newBadge);
    }

    /** @test */
    public function user_upgrades_to_diamant_with_titre_foncier_and_twenty_transactions(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'OR',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'nombre_transactions' => 20,
            'note_moyenne' => 4.8,
            'nombre_litiges' => 0,
        ]);

        $newBadge = $this->certificationService->calculateBadgeUpgrade($user);

        $this->assertEquals('DIAMANT', $newBadge);
    }

    /** @test */
    public function user_cannot_upgrade_without_meeting_all_requirements(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'NON_VERIFIE', // Missing CNI
            'nombre_transactions' => 5,
            'note_moyenne' => 4.5,
            'nombre_litiges' => 0,
        ]);

        $newBadge = $this->certificationService->calculateBadgeUpgrade($user);

        $this->assertNull($newBadge);
        $this->assertEquals('BRONZE', $user->fresh()->badge_certification);
    }

    /** @test */
    public function user_with_too_many_disputes_cannot_upgrade(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 10,
            'note_moyenne' => 4.5,
            'nombre_litiges' => 3, // Too many disputes
        ]);

        $newBadge = $this->certificationService->calculateBadgeUpgrade($user);

        $this->assertNull($newBadge);
    }

    // ==========================================
    // Badge Downgrade Tests (FR-058)
    // ==========================================

    /** @test */
    public function user_downgrades_when_rating_drops(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'OR',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 5,
            'note_moyenne' => 3.2, // Dropped below 4.0
            'nombre_litiges' => 0,
        ]);

        $newBadge = $this->certificationService->checkBadgeDowngrade($user);

        $this->assertEquals('ARGENT', $newBadge);
    }

    /** @test */
    public function user_downgrades_when_disputes_increase(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'DIAMANT',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'nombre_transactions' => 25,
            'note_moyenne' => 4.8,
            'nombre_litiges' => 4, // Too many disputes
        ]);

        $newBadge = $this->certificationService->checkBadgeDowngrade($user);

        $this->assertNotNull($newBadge);
        $this->assertNotEquals('DIAMANT', $newBadge);
    }

    // ==========================================
    // Document Upload Tests (FR-054)
    // ==========================================

    /** @test */
    public function user_can_upload_cni_document(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $this->actingAs($user);

        $file = UploadedFile::fake()->image('cni.jpg', 1200, 800);

        $response = $this->postJson('/api/certifications/upload', [
            'type_document' => 'CNI',
            'fichier' => $file,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'data' => ['id', 'type_document', 'fichier_url', 'statut_verification'],
        ]);

        $this->assertDatabaseHas('certification_documents', [
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);
    }

    /** @test */
    public function user_can_upload_titre_foncier_document(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('titre_foncier.pdf', 2048, 'application/pdf');

        $response = $this->postJson('/api/certifications/upload', [
            'type_document' => 'TITRE_FONCIER',
            'fichier' => $file,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('certification_documents', [
            'user_id' => $user->id,
            'type_document' => 'TITRE_FONCIER',
        ]);
    }

    /** @test */
    public function upload_fails_with_invalid_file_type(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('document.exe', 1024, 'application/x-msdownload');

        $response = $this->postJson('/api/certifications/upload', [
            'type_document' => 'CNI',
            'fichier' => $file,
        ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function upload_fails_with_oversized_file(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $this->actingAs($user);

        // Create a 15MB file (exceeds 10MB limit)
        $file = UploadedFile::fake()->create('large_document.jpg', 15360, 'image/jpeg');

        $response = $this->postJson('/api/certifications/upload', [
            'type_document' => 'CNI',
            'fichier' => $file,
        ]);

        $response->assertStatus(422);
    }

    // ==========================================
    // Document Verification Tests (FR-054)
    // ==========================================

    /** @test */
    public function admin_can_verify_document(): void
    {
        $admin = User::factory()->create(['type_utilisateur' => 'ADMIN']);
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'statut_verification' => 'NON_VERIFIE',
        ]);

        $document = CertificationDocument::factory()->create([
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);

        $this->actingAs($admin);

        $response = $this->postJson("/api/certifications/{$document->id}/verify", [
            'approved' => true,
            'comment' => 'Document valide',
        ]);

        $response->assertStatus(200);

        // Check document was updated
        $document->refresh();
        $this->assertEquals('APPROUVE', $document->statut_verification);
        $this->assertNotNull($document->date_verification);

        // Check user verification status was updated
        $user->refresh();
        $this->assertEquals('CNI_VERIFIEE', $user->statut_verification);
    }

    /** @test */
    public function admin_can_reject_document(): void
    {
        $admin = User::factory()->create(['type_utilisateur' => 'ADMIN']);
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);

        $document = CertificationDocument::factory()->create([
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);

        $this->actingAs($admin);

        $response = $this->postJson("/api/certifications/{$document->id}/verify", [
            'approved' => false,
            'comment' => 'Document illisible, veuillez renvoyer une meilleure qualité',
        ]);

        $response->assertStatus(200);

        $document->refresh();
        $this->assertEquals('REJETE', $document->statut_verification);
        $this->assertStringContainsString('illisible', $document->commentaire_verification);
    }

    /** @test */
    public function non_admin_cannot_verify_documents(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $document = CertificationDocument::factory()->create([
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);

        $this->actingAs($user);

        $response = $this->postJson("/api/certifications/{$document->id}/verify", [
            'approved' => true,
        ]);

        $response->assertStatus(403);
    }

    // ==========================================
    // Certification Progression API Tests (FR-057)
    // ==========================================

    /** @test */
    public function user_can_fetch_certification_progress(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'ARGENT',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 3,
            'note_moyenne' => 4.2,
            'nombre_litiges' => 0,
        ]);

        $this->actingAs($user);

        $response = $this->getJson('/api/certifications/me');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'current_badge',
                'next_badge',
                'progress',
                'requirements_met',
                'requirements_missing',
            ],
        ]);

        $data = $response->json('data');
        $this->assertEquals('ARGENT', $data['current_badge']);
        $this->assertEquals('OR', $data['next_badge']);
    }

    /** @test */
    public function diamant_user_has_no_next_badge(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'DIAMANT',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'nombre_transactions' => 25,
            'note_moyenne' => 4.9,
            'nombre_litiges' => 0,
        ]);

        $this->actingAs($user);

        $response = $this->getJson('/api/certifications/me');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('DIAMANT', $data['current_badge']);
        $this->assertNull($data['next_badge']);
        $this->assertEquals(100, $data['progress']);
    }

    // ==========================================
    // Badge Discount Tests (FR-056)
    // ==========================================

    /** @test */
    public function bronze_user_has_zero_percent_discount(): void
    {
        $user = User::factory()->create([
            'badge_certification' => 'BRONZE',
        ]);

        $this->assertEquals(0, $this->getBadgeDiscount($user->badge_certification));
    }

    /** @test */
    public function argent_user_has_five_percent_discount(): void
    {
        $user = User::factory()->create([
            'badge_certification' => 'ARGENT',
        ]);

        $this->assertEquals(5, $this->getBadgeDiscount($user->badge_certification));
    }

    /** @test */
    public function or_user_has_ten_percent_discount(): void
    {
        $user = User::factory()->create([
            'badge_certification' => 'OR',
        ]);

        $this->assertEquals(10, $this->getBadgeDiscount($user->badge_certification));
    }

    /** @test */
    public function diamant_user_has_fifteen_percent_discount(): void
    {
        $user = User::factory()->create([
            'badge_certification' => 'DIAMANT',
        ]);

        $this->assertEquals(15, $this->getBadgeDiscount($user->badge_certification));
    }

    // ==========================================
    // Document Deletion Tests
    // ==========================================

    /** @test */
    public function user_can_delete_pending_document(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $document = CertificationDocument::factory()->create([
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/certifications/{$document->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('certification_documents', ['id' => $document->id]);
    }

    /** @test */
    public function user_cannot_delete_approved_document(): void
    {
        $user = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $document = CertificationDocument::factory()->create([
            'user_id' => $user->id,
            'type_document' => 'CNI',
            'statut_verification' => 'APPROUVE',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/certifications/{$document->id}");

        $response->assertStatus(403);
    }

    /** @test */
    public function user_cannot_delete_another_users_document(): void
    {
        $user1 = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);
        $user2 = User::factory()->create(['type_utilisateur' => 'PROPRIETAIRE']);

        $document = CertificationDocument::factory()->create([
            'user_id' => $user1->id,
            'type_document' => 'CNI',
            'statut_verification' => 'EN_ATTENTE',
        ]);

        $this->actingAs($user2);

        $response = $this->deleteJson("/api/certifications/{$document->id}");

        $response->assertStatus(403);
    }

    // ==========================================
    // Artisan Command Tests
    // ==========================================

    /** @test */
    public function check_badge_upgrades_command_works(): void
    {
        // Create users who should be upgraded
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 2,
            'note_moyenne' => 4.0,
            'nombre_litiges' => 0,
        ]);

        $this->artisan('immog:check-badge-upgrades')
            ->assertSuccessful();

        $user->refresh();
        $this->assertEquals('ARGENT', $user->badge_certification);
    }

    /** @test */
    public function check_badge_downgrades_command_works(): void
    {
        // Create user who should be downgraded
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'OR',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 5,
            'note_moyenne' => 3.0, // Below requirement
            'nombre_litiges' => 0,
        ]);

        $this->artisan('immog:check-badge-downgrades')
            ->assertSuccessful();

        $user->refresh();
        $this->assertNotEquals('OR', $user->badge_certification);
    }

    /** @test */
    public function dry_run_mode_does_not_change_badges(): void
    {
        $user = User::factory()->create([
            'type_utilisateur' => 'PROPRIETAIRE',
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'CNI_VERIFIEE',
            'nombre_transactions' => 5,
            'note_moyenne' => 4.5,
            'nombre_litiges' => 0,
        ]);

        $this->artisan('immog:check-badge-upgrades', ['--dry-run' => true])
            ->assertSuccessful();

        $user->refresh();
        $this->assertEquals('BRONZE', $user->badge_certification);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private function getBadgeDiscount(string $badge): int
    {
        $discounts = [
            'BRONZE' => 0,
            'ARGENT' => 5,
            'OR' => 10,
            'DIAMANT' => 15,
        ];

        return $discounts[$badge] ?? 0;
    }
}
