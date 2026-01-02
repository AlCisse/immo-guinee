<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add performance indexes for high-traffic queries.
     */
    public function up(): void
    {
        // Listings table indexes
        Schema::table('listings', function (Blueprint $table) {
            // For filtering by owner
            if (!$this->hasIndex('listings', 'listings_user_id_index')) {
                $table->index('user_id', 'listings_user_id_index');
            }
            // For filtering by type and status (common search)
            if (!$this->hasIndex('listings', 'listings_type_statut_index')) {
                $table->index(['type_bien', 'statut'], 'listings_type_statut_index');
            }
            // For sorting by date with status filter
            if (!$this->hasIndex('listings', 'listings_created_statut_index')) {
                $table->index(['created_at', 'statut'], 'listings_created_statut_index');
            }
            // For location-based queries
            if (!$this->hasIndex('listings', 'listings_commune_quartier_index')) {
                $table->index(['commune', 'quartier'], 'listings_commune_quartier_index');
            }
        });

        // Messages table indexes
        Schema::table('messages', function (Blueprint $table) {
            // For conversation pagination
            if (!$this->hasIndex('messages', 'messages_conversation_created_index')) {
                $table->index(['conversation_id', 'created_at'], 'messages_conversation_created_index');
            }
        });

        // Visits table indexes
        Schema::table('visites', function (Blueprint $table) {
            // For scheduling queries
            if (!$this->hasIndex('visites', 'visites_date_statut_index')) {
                $table->index(['date_visite', 'statut'], 'visites_date_statut_index');
            }
            // For reminder queries
            if (!$this->hasIndex('visites', 'visites_reminder_index')) {
                $table->index(['reminder_24h_sent', 'reminder_12h_sent', 'statut'], 'visites_reminder_index');
            }
        });

        // Contracts table indexes
        Schema::table('contracts', function (Blueprint $table) {
            // For user contract lists
            if (!$this->hasIndex('contracts', 'contracts_listing_statut_index')) {
                $table->index(['listing_id', 'statut'], 'contracts_listing_statut_index');
            }
            // For bailleur/locataire queries
            if (!$this->hasIndex('contracts', 'contracts_bailleur_id_index')) {
                $table->index('bailleur_id', 'contracts_bailleur_id_index');
            }
            if (!$this->hasIndex('contracts', 'contracts_locataire_id_index')) {
                $table->index('locataire_id', 'contracts_locataire_id_index');
            }
        });

        // Notifications table indexes
        Schema::table('notifications', function (Blueprint $table) {
            // For user notification list with unread filter
            if (!$this->hasIndex('notifications', 'notifications_user_read_index')) {
                $table->index(['user_id', 'is_read', 'created_at'], 'notifications_user_read_index');
            }
        });

        // OAuth tables indexes (for cascade delete performance)
        Schema::table('oauth_access_tokens', function (Blueprint $table) {
            if (!$this->hasIndex('oauth_access_tokens', 'oauth_access_tokens_user_client_index')) {
                $table->index(['user_id', 'client_id'], 'oauth_access_tokens_user_client_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex('listings_user_id_index');
            $table->dropIndex('listings_type_statut_index');
            $table->dropIndex('listings_created_statut_index');
            $table->dropIndex('listings_commune_quartier_index');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_conversation_created_index');
        });

        Schema::table('visites', function (Blueprint $table) {
            $table->dropIndex('visites_date_statut_index');
            $table->dropIndex('visites_reminder_index');
        });

        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex('contracts_listing_statut_index');
            $table->dropIndex('contracts_bailleur_id_index');
            $table->dropIndex('contracts_locataire_id_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_index');
        });

        Schema::table('oauth_access_tokens', function (Blueprint $table) {
            $table->dropIndex('oauth_access_tokens_user_client_index');
        });
    }

    /**
     * Check if an index exists on a table.
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $indexes = Schema::getIndexes($table);
        foreach ($indexes as $index) {
            if ($index['name'] === $indexName) {
                return true;
            }
        }
        return false;
    }
};
