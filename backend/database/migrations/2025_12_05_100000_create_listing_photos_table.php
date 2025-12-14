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
        Schema::create('listing_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('listing_id')->constrained()->cascadeOnDelete();

            // Storage information
            $table->string('disk')->default('listings'); // MinIO disk name
            $table->string('path'); // Path in MinIO bucket
            $table->string('original_name'); // Original filename
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable(); // File size in bytes

            // Image variants (stored in same bucket with different paths)
            $table->string('thumbnail_path')->nullable(); // 150x150
            $table->string('medium_path')->nullable(); // 600x400
            $table->string('large_path')->nullable(); // 1200x800

            // Metadata
            $table->boolean('is_primary')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->string('alt_text')->nullable();
            $table->json('metadata')->nullable(); // EXIF data, dimensions, etc.

            $table->timestamps();

            // Indexes
            $table->index(['listing_id', 'order']);
            $table->index(['listing_id', 'is_primary']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('listing_photos');
    }
};
