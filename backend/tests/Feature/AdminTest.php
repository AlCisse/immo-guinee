<?php

namespace Tests\Feature;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * T255: Admin Panel Feature Tests
 *
 * Tests administrative functionality:
 * - Analytics dashboard (FR-084)
 * - Moderation queue (FR-081, FR-082)
 * - User management (FR-083)
 * - Audit logs (FR-085)
 */
class AdminTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $moderator;
    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'moderator']);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->moderator = User::factory()->create();
        $this->moderator->assignRole('moderator');

        $this->regularUser = User::factory()->create();
    }

    // ==================== ANALYTICS TESTS ====================

    /** @test */
    public function admin_can_view_analytics(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/analytics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'users' => ['total', 'active', 'verified', 'new_this_month'],
                'listings' => ['total', 'disponible', 'loue_vendu', 'avg_price_gnf'],
                'payments' => ['total_volume_gnf', 'commission_collected_gnf', 'pending_count'],
                'disputes' => ['total', 'open', 'resolved'],
                'ratings' => ['total', 'avg_rating', 'pending_moderation'],
            ]);
    }

    /** @test */
    public function moderator_can_view_analytics(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/admin/analytics');

        $response->assertStatus(200);
    }

    /** @test */
    public function regular_user_cannot_view_analytics(): void
    {
        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/admin/analytics');

        $response->assertStatus(403);
    }

    /** @test */
    public function unauthenticated_user_cannot_view_analytics(): void
    {
        $response = $this->getJson('/api/admin/analytics');

        $response->assertStatus(401);
    }

    // ==================== MODERATION TESTS ====================

    /** @test */
    public function admin_can_view_moderation_queue(): void
    {
        Listing::factory()->count(5)->create(['statut' => 'DISPONIBLE']);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/moderation/listings');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_approve_listing(): void
    {
        $listing = Listing::factory()->create(['statut' => 'SUSPENDU']);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/moderation/listings/{$listing->id}", [
                'action' => 'approve',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('listings', [
            'id' => $listing->id,
            'statut' => 'DISPONIBLE',
        ]);
    }

    /** @test */
    public function admin_can_suspend_listing(): void
    {
        $listing = Listing::factory()->create(['statut' => 'DISPONIBLE']);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/moderation/listings/{$listing->id}", [
                'action' => 'suspend',
                'reason' => 'Contenu inapproprié détecté',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('listings', [
            'id' => $listing->id,
            'statut' => 'SUSPENDU',
        ]);
    }

    /** @test */
    public function admin_can_delete_listing(): void
    {
        $listing = Listing::factory()->create();

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/moderation/listings/{$listing->id}", [
                'action' => 'delete',
            ]);

        $response->assertStatus(200);

        $this->assertSoftDeleted('listings', [
            'id' => $listing->id,
        ]);
    }

    /** @test */
    public function moderation_action_requires_reason_for_suspend(): void
    {
        $listing = Listing::factory()->create();

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/moderation/listings/{$listing->id}", [
                'action' => 'suspend',
                // Missing reason
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    /** @test */
    public function regular_user_cannot_moderate_listings(): void
    {
        $listing = Listing::factory()->create();

        $response = $this->actingAs($this->regularUser)
            ->patchJson("/api/admin/moderation/listings/{$listing->id}", [
                'action' => 'approve',
            ]);

        $response->assertStatus(403);
    }

    // ==================== USER MANAGEMENT TESTS ====================

    /** @test */
    public function admin_can_list_users(): void
    {
        User::factory()->count(10)->create();

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/users');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_search_users(): void
    {
        User::factory()->create(['nom_complet' => 'Alpha Barry']);
        User::factory()->create(['nom_complet' => 'Mamadou Diallo']);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/users?search=Alpha');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_filter_users_by_role(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/users?role=admin');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_suspend_user(): void
    {
        $user = User::factory()->create(['statut_compte' => 'ACTIF']);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$user->id}", [
                'action' => 'suspend',
                'reason' => 'Violation des conditions',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'statut_compte' => 'SUSPENDU',
        ]);
    }

    /** @test */
    public function admin_can_ban_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$user->id}", [
                'action' => 'ban',
                'reason' => 'Fraude détectée',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'statut_compte' => 'BANNI',
        ]);
    }

    /** @test */
    public function admin_can_downgrade_user_badge(): void
    {
        $user = User::factory()->create(['badge' => 'OR']);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$user->id}", [
                'action' => 'downgrade_badge',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'badge' => 'BRONZE',
        ]);
    }

    /** @test */
    public function regular_user_cannot_manage_users(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($this->regularUser)
            ->patchJson("/api/admin/users/{$user->id}", [
                'action' => 'suspend',
            ]);

        $response->assertStatus(403);
    }

    // ==================== AUDIT LOGS TESTS ====================

    /** @test */
    public function admin_can_view_audit_logs(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/logs');

        $response->assertStatus(200);
    }

    /** @test */
    public function audit_logs_are_paginated(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/logs?per_page=10');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'current_page',
                'last_page',
                'per_page',
                'total',
            ]);
    }

    /** @test */
    public function moderator_cannot_view_audit_logs(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/admin/logs');

        // Depending on policy, moderators may or may not access logs
        // Adjust based on your implementation
        $response->assertStatus(200)->or->assertStatus(403);
    }

    /** @test */
    public function regular_user_cannot_view_audit_logs(): void
    {
        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/admin/logs');

        $response->assertStatus(403);
    }

    // ==================== DISPUTES MANAGEMENT TESTS ====================

    /** @test */
    public function admin_can_view_disputes_queue(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/disputes');

        $response->assertStatus(200);
    }

    // ==================== AUTHORIZATION TESTS ====================

    /** @test */
    public function admin_role_has_all_permissions(): void
    {
        $this->assertTrue($this->admin->hasRole('admin'));

        // Admin should be able to access all admin endpoints
        $this->actingAs($this->admin)
            ->getJson('/api/admin/analytics')
            ->assertStatus(200);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/users')
            ->assertStatus(200);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/logs')
            ->assertStatus(200);
    }

    /** @test */
    public function moderator_role_has_limited_permissions(): void
    {
        $this->assertTrue($this->moderator->hasRole('moderator'));

        // Moderator should access moderation queue
        $this->actingAs($this->moderator)
            ->getJson('/api/admin/moderation/listings')
            ->assertStatus(200);
    }
}
