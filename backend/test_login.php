<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

try {
    echo "=== Testing Login Process ===\n\n";

    // Step 1: Find user
    echo "1. Finding user with phone 224620000000...\n";
    $user = User::where('telephone', '224620000000')->first();

    if (!$user) {
        echo "   ERROR: User not found!\n";
        exit(1);
    }
    echo "   Found user: " . ($user->nom_complet ?: $user->email) . "\n";

    // Step 2: Check password
    echo "\n2. Checking password...\n";
    $passwordOk = Hash::check('admin123', $user->mot_de_passe);
    echo "   Password check: " . ($passwordOk ? "OK" : "FAIL") . "\n";

    // Step 3: Check status flags
    echo "\n3. Checking status flags...\n";
    echo "   is_active: " . ($user->is_active ? "true" : "false") . "\n";
    echo "   is_suspended: " . ($user->is_suspended ? "true" : "false") . "\n";
    echo "   telephone_verified_at: " . ($user->telephone_verified_at ?? "NULL") . "\n";

    // Step 4: Create token
    echo "\n4. Creating token...\n";
    $token = $user->createToken('auth_token')->accessToken;
    echo "   Token created: " . substr($token, 0, 50) . "...\n";

    // Step 5: Test LoginResponse
    echo "\n5. Testing LoginResponse...\n";
    $loginResponse = app(\App\Actions\Auth\LoginResponse::class);
    echo "   Got LoginResponse instance\n";

    // Step 6: Call toResponse
    echo "\n6. Calling toResponse...\n";
    $response = $loginResponse->toResponse($user, $token);
    echo "   Response status: " . $response->getStatusCode() . "\n";
    echo "   Response content:\n";
    echo $response->getContent() . "\n";

    echo "\n=== Test Complete ===\n";

} catch (Exception $e) {
    echo "\nERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
