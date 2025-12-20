<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EnsureWahaSession extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'waha:ensure-session {--force : Force restart even if session is working}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ensure WAHA WhatsApp session is running and restart if needed';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $wahaUrl = config('services.waha.url', env('WAHA_URL', 'http://waha:3000'));
        $apiKey = $this->getApiKey();
        $sessionName = config('services.waha.session', env('WAHA_SESSION_NAME', 'default'));

        $this->info("Checking WAHA session '{$sessionName}' at {$wahaUrl}...");

        try {
            // First, check if WAHA is reachable
            if (!$this->isWahaReachable($wahaUrl, $apiKey)) {
                $this->warn("WAHA is not reachable yet, waiting...");
                sleep(5);
                if (!$this->isWahaReachable($wahaUrl, $apiKey)) {
                    $this->error("WAHA is not reachable after retry");
                    return Command::FAILURE;
                }
            }

            // Check current session status
            $response = Http::withHeaders([
                'X-Api-Key' => $apiKey,
            ])->timeout(10)->get("{$wahaUrl}/api/sessions/{$sessionName}");

            if ($response->successful()) {
                $session = $response->json();
                $status = $session['status'] ?? 'UNKNOWN';

                if ($status === 'WORKING' && !$this->option('force')) {
                    $this->info("✓ Session is WORKING (connected as: " . ($session['me']['pushName'] ?? 'Unknown') . ")");
                    Log::info('WAHA session is working', ['session' => $sessionName, 'status' => $status]);
                    return Command::SUCCESS;
                }

                // Session exists but not working - restart it
                if (in_array($status, ['STOPPED', 'FAILED', 'UNKNOWN'])) {
                    $this->warn("Session status: {$status}. Starting session...");
                    return $this->startSession($wahaUrl, $apiKey, $sessionName);
                }

                // Session is starting or scanning QR
                if ($status === 'STARTING') {
                    $this->info("Session is still starting, waiting...");
                    return $this->waitForSession($wahaUrl, $apiKey, $sessionName);
                }

                if ($status === 'SCAN_QR_CODE') {
                    $this->warn("⚠ Session requires QR code scan. Access WAHA dashboard: https://waha.immoguinee.com");
                    Log::warning('WAHA session requires QR code scan', ['session' => $sessionName]);
                    return Command::FAILURE;
                }

                $this->warn("Session status: {$status}. Attempting restart...");
            } else {
                $this->warn("Session not found. Creating new session...");
            }

            return $this->startSession($wahaUrl, $apiKey, $sessionName);

        } catch (\Exception $e) {
            $this->error("Error: " . $e->getMessage());
            Log::error('WAHA session check failed', [
                'session' => $sessionName,
                'error' => $e->getMessage(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Check if WAHA is reachable.
     */
    private function isWahaReachable(string $wahaUrl, string $apiKey): bool
    {
        try {
            $response = Http::withHeaders([
                'X-Api-Key' => $apiKey,
            ])->timeout(5)->get("{$wahaUrl}/api/health");

            return $response->successful() || $response->status() === 401;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Start a WAHA session.
     */
    private function startSession(string $wahaUrl, string $apiKey, string $sessionName): int
    {
        $startResponse = Http::withHeaders([
            'X-Api-Key' => $apiKey,
        ])->timeout(30)->post("{$wahaUrl}/api/sessions/start", [
            'name' => $sessionName,
        ]);

        if ($startResponse->successful()) {
            $result = $startResponse->json();
            $this->info("✓ Session start requested: " . ($result['status'] ?? 'STARTING'));
            Log::info('WAHA session start requested', ['session' => $sessionName, 'result' => $result]);

            return $this->waitForSession($wahaUrl, $apiKey, $sessionName);
        } else {
            // If session already exists, try to get its status
            if (str_contains($startResponse->body(), 'already exists')) {
                $this->info("Session already exists, checking status...");
                return $this->waitForSession($wahaUrl, $apiKey, $sessionName);
            }

            $this->error("Failed to start session: " . $startResponse->body());
            Log::error('Failed to start WAHA session', [
                'session' => $sessionName,
                'response' => $startResponse->body(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Wait for session to be ready.
     */
    private function waitForSession(string $wahaUrl, string $apiKey, string $sessionName): int
    {
        $this->info("Waiting for session to connect...");
        $attempts = 0;
        $maxAttempts = 15;

        while ($attempts < $maxAttempts) {
            sleep(2);
            $attempts++;

            $checkResponse = Http::withHeaders([
                'X-Api-Key' => $apiKey,
            ])->timeout(10)->get("{$wahaUrl}/api/sessions/{$sessionName}");

            if ($checkResponse->successful()) {
                $checkResult = $checkResponse->json();
                $status = $checkResult['status'] ?? 'UNKNOWN';

                if ($status === 'WORKING') {
                    $this->info("✓ Session is now WORKING!");
                    Log::info('WAHA session is now working', ['session' => $sessionName]);
                    return Command::SUCCESS;
                }

                if ($status === 'SCAN_QR_CODE') {
                    $this->warn("⚠ Session requires QR code scan. Access WAHA dashboard: https://waha.immoguinee.com");
                    Log::warning('WAHA session requires QR code scan', ['session' => $sessionName]);
                    return Command::FAILURE;
                }

                $this->line("  Status: {$status} (attempt {$attempts}/{$maxAttempts})");
            }
        }

        $this->error("Session did not reach WORKING status after {$maxAttempts} attempts");
        Log::error('WAHA session did not reach WORKING status', ['session' => $sessionName, 'attempts' => $maxAttempts]);
        return Command::FAILURE;
    }

    /**
     * Get the WAHA API key from environment or secret file.
     */
    private function getApiKey(): string
    {
        // Try secret file first (Docker Swarm)
        $secretFile = env('WAHA_API_KEY_FILE');
        if ($secretFile && file_exists($secretFile)) {
            return trim(file_get_contents($secretFile));
        }

        // Fall back to environment variable
        return config('services.waha.api_key', env('WAHA_API_KEY', ''));
    }
}
