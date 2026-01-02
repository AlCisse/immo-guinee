<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add foreign key constraints to OAuth tables to prevent orphaned records
     * when users or clients are deleted.
     */
    public function up(): void
    {
        // Clean up orphaned records before adding constraints
        $this->cleanupOrphanedRecords();

        // Add FK to oauth_auth_codes
        Schema::table('oauth_auth_codes', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('client_id')
                ->references('id')
                ->on('oauth_clients')
                ->onDelete('cascade');
        });

        // Add FK to oauth_access_tokens
        Schema::table('oauth_access_tokens', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('client_id')
                ->references('id')
                ->on('oauth_clients')
                ->onDelete('cascade');
        });

        // Add FK to oauth_refresh_tokens
        Schema::table('oauth_refresh_tokens', function (Blueprint $table) {
            $table->foreign('access_token_id')
                ->references('id')
                ->on('oauth_access_tokens')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('oauth_refresh_tokens', function (Blueprint $table) {
            $table->dropForeign(['access_token_id']);
        });

        Schema::table('oauth_access_tokens', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['client_id']);
        });

        Schema::table('oauth_auth_codes', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['client_id']);
        });
    }

    /**
     * Remove orphaned OAuth records that would violate FK constraints.
     */
    private function cleanupOrphanedRecords(): void
    {
        // Delete refresh tokens with non-existent access tokens
        DB::table('oauth_refresh_tokens')
            ->whereNotIn('access_token_id', function ($query) {
                $query->select('id')->from('oauth_access_tokens');
            })
            ->delete();

        // Delete access tokens with non-existent users
        DB::table('oauth_access_tokens')
            ->whereNotNull('user_id')
            ->whereNotIn('user_id', function ($query) {
                $query->select('id')->from('users');
            })
            ->delete();

        // Delete access tokens with non-existent clients
        DB::table('oauth_access_tokens')
            ->whereNotIn('client_id', function ($query) {
                $query->select('id')->from('oauth_clients');
            })
            ->delete();

        // Delete auth codes with non-existent users
        DB::table('oauth_auth_codes')
            ->whereNotIn('user_id', function ($query) {
                $query->select('id')->from('users');
            })
            ->delete();

        // Delete auth codes with non-existent clients
        DB::table('oauth_auth_codes')
            ->whereNotIn('client_id', function ($query) {
                $query->select('id')->from('oauth_clients');
            })
            ->delete();
    }
};
