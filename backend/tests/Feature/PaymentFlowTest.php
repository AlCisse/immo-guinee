<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Listing;
use App\Models\Contract;
use App\Models\Payment;
use App\Services\CommissionCalculatorService;
use App\Services\EscrowService;
use App\Services\QuittanceService;
use App\Jobs\ProcessPaymentConfirmationJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Event;
use Laravel\Passport\Passport;
use Tests\TestCase;
use Mockery;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $proprietaire;
    protected User $locataire;
    protected Listing $listing;
    protected Contract $contract;

    protected function setUp(): void
    {
        parent::setUp();

        // Create owner with badge
        $this->proprietaire = User::factory()->create([
            'type_compte' => 'proprietaire',
            'telephone' => '+224620000001',
            'is_verified' => true,
            'badge' => 'bronze',
        ]);

        // Create tenant
        $this->locataire = User::factory()->create([
            'type_compte' => 'locataire',
            'telephone' => '+224620000002',
            'is_verified' => true,
            'badge' => 'bronze',
        ]);

        // Create listing for residential rental
        $this->listing = Listing::factory()->create([
            'proprietaire_id' => $this->proprietaire->id,
            'type_bien' => 'appartement',
            'type_transaction' => 'location',
            'statut' => 'publiee',
            'prix' => 2500000, // 2,500,000 GNF per month
        ]);

        // Create signed contract ready for payment
        $this->contract = Contract::factory()->create([
            'listing_id' => $this->listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'type_contrat' => 'BAIL_LOCATION_RESIDENTIEL',
            'loyer_mensuel' => 2500000,
            'avance_mois' => 2,
            'caution_mois' => 2,
            'statut' => 'actif',
            'date_signature_locataire' => now()->subDay(),
            'date_signature_proprietaire' => now()->subDay(),
        ]);

        // Configure fake storage and queue
        Storage::fake('s3');
        Queue::fake();
    }

    // ==========================================
    // Commission Calculation Tests (FR-039, FR-040)
    // ==========================================

    /**
     * Test commission calculation for residential rental (50% of monthly rent)
     */
    public function test_commission_calculation_residential_rental(): void
    {
        $calculator = app(CommissionCalculatorService::class);

        $result = $calculator->calculateForContract($this->contract);

        // 50% of monthly rent = 1,250,000 GNF
        $this->assertEquals(1250000, $result['commission']);
        $this->assertEquals('location', $result['type']);
        $this->assertEquals(0.5, $result['rate']);
    }

    /**
     * Test commission calculation for land sale (1% of sale price)
     */
    public function test_commission_calculation_land_sale(): void
    {
        $listing = Listing::factory()->create([
            'proprietaire_id' => $this->proprietaire->id,
            'type_bien' => 'terrain',
            'type_transaction' => 'vente',
            'prix' => 100000000, // 100M GNF
        ]);

        $contract = Contract::factory()->create([
            'listing_id' => $listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'type_contrat' => 'VENTE_TERRAIN',
            'prix_vente' => 100000000,
            'statut' => 'actif',
        ]);

        $calculator = app(CommissionCalculatorService::class);
        $result = $calculator->calculateForContract($contract);

        // 1% of 100M = 1M GNF
        $this->assertEquals(1000000, $result['commission']);
        $this->assertEquals('vente_terrain', $result['type']);
        $this->assertEquals(0.01, $result['rate']);
    }

    /**
     * Test commission calculation for house/villa sale (2% of sale price)
     */
    public function test_commission_calculation_house_sale(): void
    {
        $listing = Listing::factory()->create([
            'proprietaire_id' => $this->proprietaire->id,
            'type_bien' => 'villa',
            'type_transaction' => 'vente',
            'prix' => 500000000, // 500M GNF
        ]);

        $contract = Contract::factory()->create([
            'listing_id' => $listing->id,
            'proprietaire_id' => $this->proprietaire->id,
            'locataire_id' => $this->locataire->id,
            'type_contrat' => 'VENTE_IMMOBILIER',
            'prix_vente' => 500000000,
            'statut' => 'actif',
        ]);

        $calculator = app(CommissionCalculatorService::class);
        $result = $calculator->calculateForContract($contract);

        // 2% of 500M = 10M GNF
        $this->assertEquals(10000000, $result['commission']);
        $this->assertEquals('vente_immobilier', $result['type']);
        $this->assertEquals(0.02, $result['rate']);
    }

    // ==========================================
    // Badge Discount Tests (FR-056)
    // ==========================================

    /**
     * Test badge discounts are applied correctly
     */
    public function test_badge_discounts_applied(): void
    {
        $calculator = app(CommissionCalculatorService::class);
        $baseCommission = 1000000;

        // Bronze - 0% discount
        $bronzeUser = User::factory()->create(['badge' => 'bronze']);
        $bronzeResult = $calculator->applyBadgeDiscount($baseCommission, $bronzeUser);
        $this->assertEquals(1000000, $bronzeResult['final_commission']);
        $this->assertEquals(0, $bronzeResult['discount_amount']);

        // Argent - 5% discount
        $argentUser = User::factory()->create(['badge' => 'argent']);
        $argentResult = $calculator->applyBadgeDiscount($baseCommission, $argentUser);
        $this->assertEquals(950000, $argentResult['final_commission']);
        $this->assertEquals(50000, $argentResult['discount_amount']);

        // Or - 10% discount
        $orUser = User::factory()->create(['badge' => 'or']);
        $orResult = $calculator->applyBadgeDiscount($baseCommission, $orUser);
        $this->assertEquals(900000, $orResult['final_commission']);
        $this->assertEquals(100000, $orResult['discount_amount']);

        // Diamant - 15% discount
        $diamantUser = User::factory()->create(['badge' => 'diamant']);
        $diamantResult = $calculator->applyBadgeDiscount($baseCommission, $diamantUser);
        $this->assertEquals(850000, $diamantResult['final_commission']);
        $this->assertEquals(150000, $diamantResult['discount_amount']);
    }

    // ==========================================
    // Invoice Breakdown Tests (FR-041)
    // ==========================================

    /**
     * Test invoice breakdown has 3 sections
     */
    public function test_invoice_breakdown_structure(): void
    {
        $calculator = app(CommissionCalculatorService::class);
        $invoice = $calculator->getInvoiceBreakdown($this->contract);

        $this->assertArrayHasKey('sections', $invoice);
        $this->assertArrayHasKey('total', $invoice);
        $this->assertArrayHasKey('pour_proprietaire', $invoice);
        $this->assertArrayHasKey('pour_plateforme', $invoice);

        // Check sections
        $sectionLabels = array_column($invoice['sections'], 'label');
        $this->assertContains('Loyer', $sectionLabels);
        $this->assertContains('Caution', $sectionLabels);
        $this->assertContains('Commission plateforme', $sectionLabels);

        // Commission should be marked as non-refundable
        $commissionSection = collect($invoice['sections'])->firstWhere('label', 'Commission plateforme');
        $this->assertTrue($commissionSection['non_refundable']);
    }

    /**
     * Test invoice amounts are correct for rental
     */
    public function test_invoice_amounts_rental(): void
    {
        $calculator = app(CommissionCalculatorService::class);
        $invoice = $calculator->getInvoiceBreakdown($this->contract);

        // 2 months advance = 5,000,000 GNF
        // 2 months caution = 5,000,000 GNF
        // Commission = 50% of 2,500,000 = 1,250,000 GNF
        // Total = 11,250,000 GNF

        $this->assertEquals(11250000, $invoice['total']['amount']);
        $this->assertEquals(10000000, $invoice['pour_proprietaire']['amount']); // loyer + caution
        $this->assertEquals(1250000, $invoice['pour_plateforme']['amount']); // commission
    }

    // ==========================================
    // Payment Initiation Tests (FR-043)
    // ==========================================

    /**
     * Test payment initiation endpoint
     */
    public function test_can_initiate_payment(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/payments/initiate', [
            'contract_id' => $this->contract->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'invoice' => [
                        'sections',
                        'total',
                        'pour_proprietaire',
                        'pour_plateforme',
                    ],
                    'contract_reference',
                    'payment_methods',
                ],
            ]);
    }

    /**
     * Test only tenant can initiate payment for their contract
     */
    public function test_only_tenant_can_initiate_payment(): void
    {
        Passport::actingAs($this->proprietaire);

        $response = $this->postJson('/api/payments/initiate', [
            'contract_id' => $this->contract->id,
        ]);

        $response->assertStatus(403);
    }

    // ==========================================
    // Payment Processing Tests
    // ==========================================

    /**
     * Test processing Orange Money payment
     */
    public function test_can_process_orange_money_payment(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/payments', [
            'contract_id' => $this->contract->id,
            'methode_paiement' => 'orange_money',
            'numero_telephone' => '+224620000002',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'payment' => [
                        'id',
                        'reference_paiement',
                        'montant_total',
                        'statut_paiement',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('payments', [
            'contrat_id' => $this->contract->id,
            'methode_paiement' => 'orange_money',
        ]);
    }

    /**
     * Test processing MTN MoMo payment
     */
    public function test_can_process_mtn_momo_payment(): void
    {
        Passport::actingAs($this->locataire);

        $response = $this->postJson('/api/payments', [
            'contract_id' => $this->contract->id,
            'methode_paiement' => 'mtn_momo',
            'numero_telephone' => '+224670000002',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('payments', [
            'contrat_id' => $this->contract->id,
            'methode_paiement' => 'mtn_momo',
        ]);
    }

    // ==========================================
    // Escrow Tests (FR-044, FR-045)
    // ==========================================

    /**
     * Test payment goes to escrow status after confirmation
     */
    public function test_confirmed_payment_goes_to_escrow(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'beneficiaire_id' => $this->proprietaire->id,
            'montant_total' => 11250000,
            'statut_paiement' => 'en_cours',
        ]);

        $escrowService = app(EscrowService::class);
        $result = $escrowService->holdFunds($payment);

        $this->assertTrue($result['success']);
        $this->assertEquals('escrow', $payment->fresh()->statut_paiement);
        $this->assertNotNull($payment->fresh()->date_mise_en_escrow);
    }

    /**
     * Test escrow has 48h timeout
     */
    public function test_escrow_timeout_is_48_hours(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'statut_paiement' => 'escrow',
            'date_mise_en_escrow' => now()->subHours(47),
        ]);

        $escrowService = app(EscrowService::class);
        $status = $escrowService->getEscrowStatus($payment);

        $this->assertFalse($status['is_expired']);
        $this->assertLessThan(2, $status['hours_remaining']);
    }

    /**
     * Test escrow expires after 48h
     */
    public function test_escrow_expires_after_48_hours(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'statut_paiement' => 'escrow',
            'date_mise_en_escrow' => now()->subHours(49),
        ]);

        $escrowService = app(EscrowService::class);
        $status = $escrowService->getEscrowStatus($payment);

        $this->assertTrue($status['is_expired']);
        $this->assertEquals(0, $status['hours_remaining']);
    }

    /**
     * Test owner can validate payment early
     */
    public function test_owner_can_validate_payment(): void
    {
        Passport::actingAs($this->proprietaire);

        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'beneficiaire_id' => $this->proprietaire->id,
            'statut_paiement' => 'escrow',
            'date_mise_en_escrow' => now(),
        ]);

        $response = $this->postJson("/api/payments/{$payment->id}/validate", [
            'validated' => true,
        ]);

        $response->assertStatus(200);
        $this->assertEquals('confirme', $payment->fresh()->statut_paiement);
        $this->assertNotNull($payment->fresh()->date_validation_proprietaire);
    }

    /**
     * Test funds release after validation
     */
    public function test_funds_released_after_validation(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'beneficiaire_id' => $this->proprietaire->id,
            'montant_loyer' => 5000000,
            'montant_caution' => 5000000,
            'montant_frais_service' => 1250000,
            'montant_total' => 11250000,
            'statut_paiement' => 'escrow',
        ]);

        $escrowService = app(EscrowService::class);
        $result = $escrowService->releaseFunds($payment);

        $this->assertTrue($result['success']);
        $this->assertEquals('confirme', $payment->fresh()->statut_paiement);
        $this->assertEquals(10000000, $result['amount_to_owner']); // loyer + caution
        $this->assertEquals(1250000, $result['platform_fee']); // commission
    }

    // ==========================================
    // Webhook Tests (FR-046)
    // ==========================================

    /**
     * Test Orange Money webhook confirmation
     */
    public function test_orange_money_webhook_confirms_payment(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'reference_paiement' => 'PAY-TEST-001',
            'statut_paiement' => 'en_cours',
            'methode_paiement' => 'orange_money',
        ]);

        $webhookData = [
            'transaction_id' => 'OM-TXN-123456',
            'reference' => 'PAY-TEST-001',
            'status' => 'SUCCESS',
            'amount' => 11250000,
            'timestamp' => now()->toIso8601String(),
        ];

        $response = $this->postJson('/api/webhooks/orange-money', $webhookData, [
            'X-OM-Signature' => hash_hmac('sha256', json_encode($webhookData), config('services.orange_money.secret')),
        ]);

        $response->assertStatus(200);

        Queue::assertPushed(ProcessPaymentConfirmationJob::class);
    }

    /**
     * Test MTN MoMo webhook confirmation
     */
    public function test_mtn_momo_webhook_confirms_payment(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'reference_paiement' => 'PAY-TEST-002',
            'statut_paiement' => 'en_cours',
            'methode_paiement' => 'mtn_momo',
        ]);

        $webhookData = [
            'externalId' => 'PAY-TEST-002',
            'status' => 'SUCCESSFUL',
            'financialTransactionId' => 'MTN-FTX-789',
            'amount' => '11250000',
        ];

        $response = $this->postJson('/api/webhooks/mtn-momo', $webhookData, [
            'Authorization' => 'Bearer ' . config('services.mtn_momo.callback_token'),
        ]);

        $response->assertStatus(200);

        Queue::assertPushed(ProcessPaymentConfirmationJob::class);
    }

    // ==========================================
    // Quittance Generation Tests (FR-047)
    // ==========================================

    /**
     * Test quittance is generated after payment confirmation
     */
    public function test_quittance_generated_on_confirmation(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'beneficiaire_id' => $this->proprietaire->id,
            'montant_total' => 11250000,
            'statut_paiement' => 'escrow',
        ]);

        $quittanceService = app(QuittanceService::class);
        $result = $quittanceService->generate($payment);

        $this->assertTrue($result['success']);
        $this->assertNotNull($result['url']);
        $this->assertStringContainsString('.pdf', $result['url']);
    }

    /**
     * Test quittance can be downloaded by tenant
     */
    public function test_tenant_can_download_quittance(): void
    {
        Passport::actingAs($this->locataire);

        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'statut_paiement' => 'confirme',
            'quittance_url' => 'quittances/test-quittance.pdf',
        ]);

        Storage::disk('s3')->put('quittances/test-quittance.pdf', '%PDF-1.4 test');

        $response = $this->getJson("/api/payments/{$payment->id}/quittance");

        $response->assertStatus(200);
    }

    // ==========================================
    // Payment History Tests (FR-048)
    // ==========================================

    /**
     * Test user can view their payment history
     */
    public function test_user_can_view_payment_history(): void
    {
        Passport::actingAs($this->locataire);

        Payment::factory()->count(5)->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'beneficiaire_id' => $this->proprietaire->id,
            'statut_paiement' => 'confirme',
        ]);

        $response = $this->getJson('/api/payments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'payments',
                    'pagination' => [
                        'current_page',
                        'total',
                        'per_page',
                    ],
                ],
            ]);

        $this->assertCount(5, $response->json('data.payments'));
    }

    /**
     * Test payment history can be filtered by status
     */
    public function test_payment_history_filter_by_status(): void
    {
        Passport::actingAs($this->locataire);

        Payment::factory()->count(3)->create([
            'payeur_id' => $this->locataire->id,
            'statut_paiement' => 'confirme',
        ]);

        Payment::factory()->count(2)->create([
            'payeur_id' => $this->locataire->id,
            'statut_paiement' => 'escrow',
        ]);

        $response = $this->getJson('/api/payments?statut=escrow');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data.payments'));
    }

    // ==========================================
    // Refund Tests (FR-049)
    // ==========================================

    /**
     * Test refund request can be submitted
     */
    public function test_can_request_refund(): void
    {
        Passport::actingAs($this->locataire);

        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'statut_paiement' => 'escrow',
        ]);

        $response = $this->postJson("/api/payments/{$payment->id}/refund", [
            'reason' => 'Le propriétaire ne répond pas',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('litige', $payment->fresh()->statut_paiement);
    }

    /**
     * Test commission is NOT refunded (FR-042)
     */
    public function test_commission_not_refunded(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'montant_loyer' => 5000000,
            'montant_caution' => 5000000,
            'montant_frais_service' => 1250000,
            'montant_total' => 11250000,
            'statut_paiement' => 'escrow',
        ]);

        $escrowService = app(EscrowService::class);
        $result = $escrowService->processRefund($payment);

        // Only loyer + caution should be refunded
        $this->assertEquals(10000000, $result['refund_amount']);
        $this->assertEquals(1250000, $result['retained_commission']);
        $this->assertFalse($result['commission_refunded']);
    }

    // ==========================================
    // Cash Payment Tests (FR-052)
    // ==========================================

    /**
     * Test cash payment can be recorded
     */
    public function test_can_record_cash_payment(): void
    {
        Passport::actingAs($this->proprietaire);

        $response = $this->postJson('/api/payments/cash', [
            'contract_id' => $this->contract->id,
            'amount_received' => 11250000,
            'received_by' => 'proprietaire',
            'notes' => 'Paiement reçu en main propre',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('payments', [
            'contrat_id' => $this->contract->id,
            'methode_paiement' => 'especes',
        ]);
    }

    // ==========================================
    // Security Tests
    // ==========================================

    /**
     * Test cannot access other user's payment
     */
    public function test_cannot_access_other_users_payment(): void
    {
        $otherUser = User::factory()->create();
        Passport::actingAs($otherUser);

        $payment = Payment::factory()->create([
            'payeur_id' => $this->locataire->id,
        ]);

        $response = $this->getJson("/api/payments/{$payment->id}");

        $response->assertStatus(403);
    }

    /**
     * Test payment reference format
     */
    public function test_payment_reference_format(): void
    {
        $payment = Payment::factory()->create([
            'contrat_id' => $this->contract->id,
        ]);

        // Reference should follow pattern: PAY-YYYYMMDD-XXXXX
        $this->assertMatchesRegularExpression(
            '/^PAY-\d{8}-[A-Z0-9]{5}$/',
            $payment->reference_paiement
        );
    }

    /**
     * Test duplicate payment prevention
     */
    public function test_prevents_duplicate_payment(): void
    {
        Passport::actingAs($this->locataire);

        // Create a pending payment
        Payment::factory()->create([
            'contrat_id' => $this->contract->id,
            'payeur_id' => $this->locataire->id,
            'statut_paiement' => 'en_cours',
        ]);

        // Try to create another payment for same contract
        $response = $this->postJson('/api/payments', [
            'contract_id' => $this->contract->id,
            'methode_paiement' => 'orange_money',
            'numero_telephone' => '+224620000002',
        ]);

        $response->assertStatus(409); // Conflict
    }
}
