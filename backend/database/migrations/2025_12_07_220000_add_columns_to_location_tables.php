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
        // Add columns to regions table
        Schema::table('regions', function (Blueprint $table) {
            if (!Schema::hasColumn('regions', 'code')) {
                $table->string('code', 10)->unique()->after('id');
            }
            if (!Schema::hasColumn('regions', 'nom')) {
                $table->string('nom', 100)->after('code');
            }
            if (!Schema::hasColumn('regions', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('nom');
            }
        });

        // Add columns to prefectures table
        Schema::table('prefectures', function (Blueprint $table) {
            if (!Schema::hasColumn('prefectures', 'code')) {
                $table->string('code', 20)->unique()->after('id');
            }
            if (!Schema::hasColumn('prefectures', 'nom')) {
                $table->string('nom', 100)->after('code');
            }
            if (!Schema::hasColumn('prefectures', 'region_id')) {
                $table->foreignId('region_id')->after('nom')->constrained('regions')->onDelete('cascade');
            }
            if (!Schema::hasColumn('prefectures', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('region_id');
            }
        });

        // Add columns to sous_prefectures table
        Schema::table('sous_prefectures', function (Blueprint $table) {
            if (!Schema::hasColumn('sous_prefectures', 'code')) {
                $table->string('code', 20)->unique()->after('id');
            }
            if (!Schema::hasColumn('sous_prefectures', 'nom')) {
                $table->string('nom', 100)->after('code');
            }
            if (!Schema::hasColumn('sous_prefectures', 'prefecture_id')) {
                $table->foreignId('prefecture_id')->after('nom')->constrained('prefectures')->onDelete('cascade');
            }
            if (!Schema::hasColumn('sous_prefectures', 'commune_id')) {
                $table->foreignId('commune_id')->nullable()->after('prefecture_id');
            }
            if (!Schema::hasColumn('sous_prefectures', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('commune_id');
            }
        });

        // Create communes table for the 5 communes of Conakry
        if (!Schema::hasTable('communes')) {
            Schema::create('communes', function (Blueprint $table) {
                $table->id();
                $table->string('code', 20)->unique();
                $table->string('nom', 100);
                $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Add foreign key to sous_prefectures for commune_id
            Schema::table('sous_prefectures', function (Blueprint $table) {
                $table->foreign('commune_id')->references('id')->on('communes')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sous_prefectures', function (Blueprint $table) {
            if (Schema::hasColumn('sous_prefectures', 'commune_id')) {
                $table->dropForeign(['commune_id']);
                $table->dropColumn('commune_id');
            }
            if (Schema::hasColumn('sous_prefectures', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('sous_prefectures', 'prefecture_id')) {
                $table->dropForeign(['prefecture_id']);
                $table->dropColumn('prefecture_id');
            }
            if (Schema::hasColumn('sous_prefectures', 'nom')) {
                $table->dropColumn('nom');
            }
            if (Schema::hasColumn('sous_prefectures', 'code')) {
                $table->dropColumn('code');
            }
        });

        Schema::table('prefectures', function (Blueprint $table) {
            if (Schema::hasColumn('prefectures', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('prefectures', 'region_id')) {
                $table->dropForeign(['region_id']);
                $table->dropColumn('region_id');
            }
            if (Schema::hasColumn('prefectures', 'nom')) {
                $table->dropColumn('nom');
            }
            if (Schema::hasColumn('prefectures', 'code')) {
                $table->dropColumn('code');
            }
        });

        Schema::table('regions', function (Blueprint $table) {
            if (Schema::hasColumn('regions', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('regions', 'nom')) {
                $table->dropColumn('nom');
            }
            if (Schema::hasColumn('regions', 'code')) {
                $table->dropColumn('code');
            }
        });

        Schema::dropIfExists('communes');
    }
};
