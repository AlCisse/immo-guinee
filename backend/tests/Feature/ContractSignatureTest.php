<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Listing;
use App\Models\Contract;
use App\Services\SignatureService;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;
use Laravel\Passport\Passport;
use Tests\TestCase;
use Mockery;

class ContractSignatureTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $proprietaire;
    protected User $locataire;
    protected Listing $listing;
    protected Contract $contract;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users with phone numbers
        $this->proprietaire = User::factory()->create([
            'type_compte' => 'proprietaire',
            'telephone' => '+224620000001',
            'is_verified' => true,
        ]);

        $this->locataire = User::factory()->create([
            'type_compte' => 'locataire',
            'telephone' => '+224620000002',
            'is_verified' => true,
        ]);

        // Create listing
        $this->listing = Listing::factory()->create([
            'proprietaire_id' => $this->proprietaire->id,
            'type_bien' => 'appartement',
            'statut' => 'publiee',
            'prix' => 2500000,
        ]);

        // Create contract awaiting signature
        $this->contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'statut' => 'en_attente_signature',
            'fichier_pdf_url' => 'contracts/test-contract.pdf',
        ]);

        // Configure fake storage
        Storage::fake('s3');
        Storage::disk('s3')->put('contracts/test-contract.pdf', '%PDF-1.4 test content');

        // Fake queue for jobs
        Queue::fake();
    }

    /**
     * Test requesting OTP for signature.
     */
    public function test_can_request_signature_otp(): void
    {
        Passport::actingAs($this->locataire);

        // Mock OTP service
        $this->mock(OtpService::class, function ($mock) {
            $mock->shouldReceive('generateAndSend')
                ->once()
                ->andReturn([
                    'otp' => '123456',
                    'expires_in' => 300,
                ]);
        });

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign/request-otp");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Code OTP envoyé',
            ])
            ->assertJsonStructure([
                'data' => ['expires_in'],
            ]);
    }

    /**
     * Test signing contract with valid OTP.
     */
    public function test_can_sign_contract_with_valid_otp(): void
    {
        Passport::actingAs($this->locataire);

        // Store OTP in cache
        $otp = '123456';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp,
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => $otp,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Contrat signé avec succès',
            ]);

        // Verify signature was recorded
        $this->assertDatabaseHas('contracts', [
            'id' => $this->contract->id,
            'statut' => 'partiellement_signe',
        ]);

        $this->contract->refresh();
        $this->assertNotNull($this->contract->date_signature_locataire);
    }

    /**
     * Test signing fails with invalid OTP.
     */
    public function test_signing_fails_with_invalid_otp(): void
    {
        Passport::actingAs($this->locataire);

        // Store different OTP in cache
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            '123456',
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => '999999',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Code OTP invalide ou expiré',
            ]);
    }

    /**
     * Test signing fails with expired OTP.
     */
    public function test_signing_fails_with_expired_otp(): void
    {
        Passport::actingAs($this->locataire);

        // No OTP in cache (simulates expiry)
        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Code OTP invalide ou expiré',
            ]);
    }

    /**
     * Test proprietaire signature.
     */
    public function test_proprietaire_can_sign_contract(): void
    {
        Passport::actingAs($this->proprietaire);

        $otp = '654321';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->proprietaire->id}",
            $otp,
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => $otp,
        ]);

        $response->assertStatus(200);

        $this->contract->refresh();
        $this->assertNotNull($this->contract->date_signature_proprietaire);
    }

    /**
     * Test both signatures complete the contract.
     */
    public function test_both_signatures_complete_contract(): void
    {
        // First signature by locataire
        Passport::actingAs($this->locataire);

        $otp1 = '111111';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp1,
            now()->addMinutes(5)
        );

        $this->postJson("/api/contracts/{$this->contract->id}/sign", ['otp' => $otp1]);

        // Second signature by proprietaire
        Passport::actingAs($this->proprietaire);

        $otp2 = '222222';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->proprietaire->id}",
            $otp2,
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", ['otp' => $otp2]);

        $response->assertStatus(200);

        $this->contract->refresh();
        $this->assertNotNull($this->contract->date_signature_proprietaire);
        $this->assertNotNull($this->contract->date_signature_locataire);
        $this->assertNotNull($this->contract->delai_retractation_expire);
        $this->assertEquals('signe', $this->contract->statut);
    }

    /**
     * Test cannot sign already signed contract.
     */
    public function test_cannot_sign_already_signed_contract(): void
    {
        // Mark contract as fully signed
        $this->contract->update([
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
            'statut' => 'actif',
            'delai_retractation_expire' => now()->subDay(),
        ]);

        Passport::actingAs($this->locataire);

        $otp = '123456';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp,
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => $otp,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Vous avez déjà signé ce contrat',
            ]);
    }

    /**
     * Test unauthorized user cannot sign.
     */
    public function test_unauthorized_user_cannot_sign(): void
    {
        $otherUser = User::factory()->create();
        Passport::actingAs($otherUser);

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => '123456',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Non autorisé à signer ce contrat',
            ]);
    }

    /**
     * Test signature generates SHA-256 hash.
     */
    public function test_signature_generates_hash(): void
    {
        Passport::actingAs($this->locataire);

        $otp = '123456';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp,
            now()->addMinutes(5)
        );

        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign", [
            'otp' => $otp,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'signature' => [
                        'signature_id',
                        'timestamp',
                        'hash',
                    ],
                ],
            ]);

        $hash = $response->json('data.signature.hash');
        $this->assertEquals(64, strlen($hash)); // SHA-256 produces 64 character hex string
    }

    /**
     * Test retraction period is 48 hours.
     */
    public function test_retraction_period_is_48_hours(): void
    {
        // Complete both signatures
        $this->contract->update([
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
            'statut' => 'signe',
        ]);

        // Trigger retraction period calculation
        $signatureService = app(SignatureService::class);
        $signatureService->lockContract($this->contract);

        $this->contract->refresh();

        $this->assertNotNull($this->contract->delai_retractation_expire);

        // Should be approximately 48 hours from now
        $expectedExpiry = now()->addHours(48);
        $actualExpiry = $this->contract->delai_retractation_expire;

        $this->assertTrue(
            abs($expectedExpiry->diffInMinutes($actualExpiry)) < 5,
            'Retraction period should be approximately 48 hours'
        );
    }

    /**
     * Test cancel contract during retraction period.
     */
    public function test_can_cancel_during_retraction_period(): void
    {
        // Set up contract in retraction period
        $this->contract->update([
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
            'statut' => 'signe',
            'delai_retractation_expire' => now()->addHours(24), // 24 hours remaining
        ]);

        Passport::actingAs($this->locataire);

        $response = $this->postJson("/api/contracts/{$this->contract->id}/cancel", [
            'motif' => 'Je ne souhaite plus procéder à cette location.',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Contrat annulé avec succès',
            ]);

        $this->assertDatabaseHas('contracts', [
            'id' => $this->contract->id,
            'statut' => 'annule',
        ]);
    }

    /**
     * Test cannot cancel after retraction period.
     */
    public function test_cannot_cancel_after_retraction_period(): void
    {
        // Set up contract with expired retraction period
        $this->contract->update([
            'date_signature_proprietaire' => now()->subDays(3),
            'date_signature_locataire' => now()->subDays(3),
            'statut' => 'actif',
            'delai_retractation_expire' => now()->subDay(),
        ]);

        Passport::actingAs($this->locataire);

        $response = $this->postJson("/api/contracts/{$this->contract->id}/cancel", [
            'motif' => 'Je veux annuler.',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'La période de rétractation est expirée',
            ]);
    }

    /**
     * Test cancel requires motif.
     */
    public function test_cancel_requires_motif(): void
    {
        $this->contract->update([
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
            'statut' => 'signe',
            'delai_retractation_expire' => now()->addHours(24),
        ]);

        Passport::actingAs($this->locataire);

        $response = $this->postJson("/api/contracts/{$this->contract->id}/cancel", [
            'motif' => '',
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test download signed contract.
     */
    public function test_can_download_signed_contract(): void
    {
        // Set up fully signed contract
        $this->contract->update([
            'date_signature_proprietaire' => now()->subDays(3),
            'date_signature_locataire' => now()->subDays(3),
            'statut' => 'actif',
            'delai_retractation_expire' => now()->subDay(),
        ]);

        Passport::actingAs($this->locataire);

        $response = $this->get("/api/contracts/{$this->contract->id}/download");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
    }

    /**
     * Test cannot download unsigned contract.
     */
    public function test_cannot_download_unsigned_contract(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->get("/api/contracts/{$this->contract->id}/download");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Le contrat doit être signé par les deux parties',
            ]);
    }

    /**
     * Test signature certificate endpoint.
     */
    public function test_can_get_signature_certificate(): void
    {
        // Set up signed contract with signatures
        $this->contract->update([
            'date_signature_proprietaire' => now(),
            'date_signature_locataire' => now(),
            'statut' => 'actif',
            'signatures' => [
                [
                    'signature_id' => 'SIG-001',
                    'user_id' => $this->proprietaire->id,
                    'user_type' => 'proprietaire',
                    'timestamp' => now()->toISOString(),
                    'hash' => hash('sha256', 'test1'),
                ],
                [
                    'signature_id' => 'SIG-002',
                    'user_id' => $this->locataire->id,
                    'user_type' => 'locataire',
                    'timestamp' => now()->toISOString(),
                    'hash' => hash('sha256', 'test2'),
                ],
            ],
        ]);

        Passport::actingAs($this->locataire);

        $response = $this->getJson("/api/contracts/{$this->contract->id}/signature-certificate");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'certificate' => [
                        'contract_reference',
                        'signatures',
                        'integrity_hash',
                    ],
                ],
            ]);
    }

    /**
     * Test signature records IP and user agent.
     */
    public function test_signature_records_metadata(): void
    {
        Passport::actingAs($this->locataire);

        $otp = '123456';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp,
            now()->addMinutes(5)
        );

        $response = $this->postJson(
            "/api/contracts/{$this->contract->id}/sign",
            ['otp' => $otp],
            [
                'X-Forwarded-For' => '192.168.1.100',
                'User-Agent' => 'Mozilla/5.0 Test Browser',
            ]
        );

        $response->assertStatus(200);

        $this->contract->refresh();
        $signatures = $this->contract->signatures ?? [];

        $this->assertNotEmpty($signatures);
        $lastSignature = end($signatures);
        $this->assertArrayHasKey('ip_address', $lastSignature);
        $this->assertArrayHasKey('user_agent', $lastSignature);
    }

    /**
     * Test OTP rate limiting.
     */
    public function test_otp_request_is_rate_limited(): void
    {
        Passport::actingAs($this->locataire);

        // Mock OTP service
        $this->mock(OtpService::class, function ($mock) {
            $mock->shouldReceive('generateAndSend')
                ->times(3)
                ->andReturn(['otp' => '123456', 'expires_in' => 300]);
        });

        // Make multiple requests
        for ($i = 0; $i < 3; $i++) {
            $this->postJson("/api/contracts/{$this->contract->id}/sign/request-otp");
        }

        // Fourth request should be rate limited
        $response = $this->postJson("/api/contracts/{$this->contract->id}/sign/request-otp");

        $response->assertStatus(429);
    }

    /**
     * Test contract status transitions.
     */
    public function test_contract_status_transitions_correctly(): void
    {
        // Initial status: en_attente_signature
        $this->assertEquals('en_attente_signature', $this->contract->statut);

        // After first signature
        Passport::actingAs($this->locataire);
        $otp = '123456';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->locataire->id}",
            $otp,
            now()->addMinutes(5)
        );
        $this->postJson("/api/contracts/{$this->contract->id}/sign", ['otp' => $otp]);

        $this->contract->refresh();
        $this->assertEquals('partiellement_signe', $this->contract->statut);

        // After second signature
        Passport::actingAs($this->proprietaire);
        $otp2 = '654321';
        Cache::put(
            "signature_otp:{$this->contract->id}:{$this->proprietaire->id}",
            $otp2,
            now()->addMinutes(5)
        );
        $this->postJson("/api/contracts/{$this->contract->id}/sign", ['otp' => $otp2]);

        $this->contract->refresh();
        $this->assertEquals('signe', $this->contract->statut);
    }
}
