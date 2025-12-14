<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add moderation fields to users (only if they don't exist)
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_flagged')) {
                $table->boolean('is_flagged')->default(false)->after('is_suspended');
            }
            if (!Schema::hasColumn('users', 'suspended_until')) {
                $table->timestamp('suspended_until')->nullable()->after('is_flagged');
            }
            if (!Schema::hasColumn('users', 'suspension_reason')) {
                $table->text('suspension_reason')->nullable()->after('suspended_until');
            }
        });

        // Add moderation fields to listings (only if they don't exist)
        Schema::table('listings', function (Blueprint $table) {
            if (!Schema::hasColumn('listings', 'reference')) {
                $table->string('reference', 20)->nullable()->after('id');
            }
            if (!Schema::hasColumn('listings', 'moderated_by')) {
                $table->uuid('moderated_by')->nullable()->after('moderated_at');
                $table->foreign('moderated_by')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('listings', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('moderated_by');
            }
            if (!Schema::hasColumn('listings', 'rejection_code')) {
                $table->string('rejection_code', 50)->nullable()->after('rejection_reason');
            }
            if (!Schema::hasColumn('listings', 'suspension_reason')) {
                $table->text('suspension_reason')->nullable()->after('rejection_code');
            }
            if (!Schema::hasColumn('listings', 'suspended_until')) {
                $table->timestamp('suspended_until')->nullable()->after('suspension_reason');
            }
            if (!Schema::hasColumn('listings', 'changes_requested')) {
                $table->json('changes_requested')->nullable()->after('suspended_until');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('users', 'is_flagged')) $columns[] = 'is_flagged';
            if (Schema::hasColumn('users', 'suspended_until')) $columns[] = 'suspended_until';
            if (Schema::hasColumn('users', 'suspension_reason')) $columns[] = 'suspension_reason';
            if (!empty($columns)) $table->dropColumn($columns);
        });

        Schema::table('listings', function (Blueprint $table) {
            if (Schema::hasColumn('listings', 'moderated_by')) {
                $table->dropForeign(['moderated_by']);
            }
            $columns = [];
            if (Schema::hasColumn('listings', 'reference')) $columns[] = 'reference';
            if (Schema::hasColumn('listings', 'moderated_by')) $columns[] = 'moderated_by';
            if (Schema::hasColumn('listings', 'rejection_reason')) $columns[] = 'rejection_reason';
            if (Schema::hasColumn('listings', 'rejection_code')) $columns[] = 'rejection_code';
            if (Schema::hasColumn('listings', 'suspension_reason')) $columns[] = 'suspension_reason';
            if (Schema::hasColumn('listings', 'suspended_until')) $columns[] = 'suspended_until';
            if (Schema::hasColumn('listings', 'changes_requested')) $columns[] = 'changes_requested';
            if (!empty($columns)) $table->dropColumn($columns);
        });
    }
};
