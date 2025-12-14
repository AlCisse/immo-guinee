<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds termination/cancellation fields for contract notice period (préavis)
     */
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            // Termination request fields
            $table->timestamp('resiliation_requested_at')->nullable()->after('archived_at');
            $table->uuid('resiliation_requested_by')->nullable()->after('resiliation_requested_at');
            $table->string('resiliation_motif')->nullable()->after('resiliation_requested_by');
            $table->date('resiliation_effective_date')->nullable()->after('resiliation_motif');
            $table->integer('preavis_months')->default(3)->after('resiliation_effective_date');

            // Confirmation by other party
            $table->timestamp('resiliation_confirmed_at')->nullable()->after('preavis_months');
            $table->uuid('resiliation_confirmed_by')->nullable()->after('resiliation_confirmed_at');

            // Index for querying contracts in termination process
            $table->index('resiliation_effective_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex(['resiliation_effective_date']);
            $table->dropColumn([
                'resiliation_requested_at',
                'resiliation_requested_by',
                'resiliation_motif',
                'resiliation_effective_date',
                'preavis_months',
                'resiliation_confirmed_at',
                'resiliation_confirmed_by',
            ]);
        });
    }
};
