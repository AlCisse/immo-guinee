<?php

use App\Http\Controllers\RssFeedController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'ImmoGuinée API',
        'version' => '1.0.0',
        'documentation' => '/api/documentation',
    ]);
});

// RSS Feeds
Route::prefix('rss')->group(function () {
    Route::get('/listings', [RssFeedController::class, 'listings'])->name('rss.listings');
    Route::get('/listings/type/{type}', [RssFeedController::class, 'listingsByType'])->name('rss.listings.type');
    Route::get('/listings/commune/{commune}', [RssFeedController::class, 'listingsByCommune'])->name('rss.listings.commune');
});
