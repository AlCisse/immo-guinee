<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('property_views', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('listing_id');
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('cascade');

            $table->uuid('user_id')->nullable(); // Null if anonymous
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            // Analytics data (FR-020)
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('referrer', 500)->nullable();
            $table->string('device_type', 50)->nullable(); // mobile, tablet, desktop
            $table->string('browser', 100)->nullable();
            $table->string('os', 100)->nullable();

            // Session tracking
            $table->string('session_id', 100)->nullable();
            $table->integer('time_spent_seconds')->default(0); // Time spent viewing

            // Geographic data (optional)
            $table->string('country', 2)->nullable(); // ISO country code
            $table->string('city', 100)->nullable();

            // Timestamps
            $table->timestamp('viewed_at')->useCurrent();
            $table->timestamps();

            // Indexes
            $table->index('listing_id');
            $table->index('user_id');
            $table->index('ip_address');
            $table->index('session_id');
            $table->index('viewed_at');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_views');
    }
};
