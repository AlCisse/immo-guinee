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

                $this->warn("Session status: {$status}. Restarting...");
            } else {
                $this->warn("Session not found or error. Creating new session...");
            }

            // Start/restart the session
            $startResponse = Http::withHeaders([
                'X-Api-Key' => $apiKey,
            ])->timeout(30)->post("{$wahaUrl}/api/sessions/start", [
                'name' => $sessionName,
            ]);

            if ($startResponse->successful()) {
                $result = $startResponse->json();
                $this->info("✓ Session started: " . ($result['status'] ?? 'STARTING'));
                Log::info('WAHA session started', ['session' => $sessionName, 'result' => $result]);

                // Wait for session to be ready
                $this->info("Waiting for session to connect...");
                $attempts = 0;
                $maxAttempts = 10;

                while ($attempts < $maxAttempts) {
                    sleep(3);
                    $attempts++;

                    $checkResponse = Http::withHeaders([
                        'X-Api-Key' => $apiKey,
                    ])->timeout(10)->get("{$wahaUrl}/api/sessions/{$sessionName}");

                    if ($checkResponse->successful()) {
                        $checkResult = $checkResponse->json();
                        $status = $checkResult['status'] ?? 'UNKNOWN';

                        if ($status === 'WORKING') {
                            $this->info("✓ Session is now WORKING!");
                            return Command::SUCCESS;
                        }

                        if ($status === 'SCAN_QR_CODE') {
                            $this->warn("⚠ Session requires QR code scan. Access WAHA dashboard to scan.");
                            Log::warning('WAHA session requires QR code scan', ['session' => $sessionName]);
                            return Command::FAILURE;
                        }

                        $this->line("  Status: {$status} (attempt {$attempts}/{$maxAttempts})");
                    }
                }

                $this->error("Session did not reach WORKING status after {$maxAttempts} attempts");
                return Command::FAILURE;

            } else {
                $this->error("Failed to start session: " . $startResponse->body());
                Log::error('Failed to start WAHA session', [
                    'session' => $sessionName,
                    'response' => $startResponse->body(),
                ]);
                return Command::FAILURE;
            }

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
