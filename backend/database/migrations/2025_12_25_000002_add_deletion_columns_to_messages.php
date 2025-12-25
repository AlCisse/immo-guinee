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
        Schema::table('messages', function (Blueprint $table) {
            // Deletion flags for "delete for me" / "delete for everyone"
            $table->boolean('deleted_for_sender')->default(false)->after('is_blocked');
            $table->boolean('deleted_for_recipient')->default(false)->after('deleted_for_sender');
            $table->boolean('deleted_for_everyone')->default(false)->after('deleted_for_recipient');

            // Message status tracking
            $table->enum('status', ['sending', 'sent', 'delivered', 'read', 'failed'])
                  ->default('sent')
                  ->after('is_read');

            // Indexes for filtering deleted messages
            $table->index(['conversation_id', 'deleted_for_everyone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['conversation_id', 'deleted_for_everyone']);
            $table->dropColumn([
                'deleted_for_sender',
                'deleted_for_recipient',
                'deleted_for_everyone',
                'status',
            ]);
        });
    }
};
