<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Exception;

class MtnMomoService
{
    /**
     * API User
     */
    protected $apiUser;

    /**
     * API Key
     */
    protected $apiKey;

    /**
     * Subscription Key
     */
    protected $subscriptionKey;

    /**
     * Base URL
     */
    protected $baseUrl;

    /**
     * Environment (sandbox or production)
     */
    protected $environment;

    public function __construct()
    {
        $this->apiUser = config('services.mtn_momo.api_user');
        $this->apiKey = config('services.mtn_momo.api_key');
        $this->subscriptionKey = config('services.mtn_momo.subscription_key');
        $this->baseUrl = config('services.mtn_momo.base_url');
        $this->environment = config('services.mtn_momo.environment', 'sandbox');
    }

    /**
     * Get OAuth access token
     *
     * @return string
     * @throws Exception
     */
    protected function getAccessToken(): string
    {
        // Check if token exists in cache
        $cachedToken = Cache::get('mtn_momo_access_token');
        if ($cachedToken) {
            return $cachedToken;
        }

        try {
            $credentials = base64_encode($this->apiUser . ':' . $this->apiKey);

            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $credentials,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
            ])->post("{$this->baseUrl}/collection/token/");

            if ($response->successful()) {
                $data = $response->json();
                $token = $data['access_token'];
                $expiresIn = $data['expires_in'] ?? 3600;

                // Cache token for slightly less than expiry time
                Cache::put('mtn_momo_access_token', $token, now()->addSeconds($expiresIn - 60));

                return $token;
            } else {
                throw new Exception('Failed to get MTN MoMo access token: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('MTN MoMo authentication failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Request to pay (collect payment from user)
     *
     * @param array $paymentData
     * @return array
     * @throws Exception
     */
    public function requestToPay(array $paymentData): array
    {
        try {
            $token = $this->getAccessToken();
            $referenceId = Str::uuid()->toString();

            $payload = [
                'amount' => (string) $paymentData['amount'],
                'currency' => 'GNF',
                'externalId' => $paymentData['external_id'],
                'payer' => [
                    'partyIdType' => 'MSISDN',
                    'partyId' => $this->formatPhoneNumber($paymentData['phone_number']),
                ],
                'payerMessage' => $paymentData['payer_message'] ?? 'Paiement ImmoGuinée',
                'payeeNote' => $paymentData['payee_note'] ?? 'Paiement pour ' . $paymentData['reference'],
            ];

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Reference-Id' => $referenceId,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/collection/v1_0/requesttopay", $payload);

            if ($response->successful() || $response->status() === 202) {
                Log::info('MTN MoMo payment requested', [
                    'reference_id' => $referenceId,
                    'external_id' => $paymentData['external_id'],
                ]);

                return [
                    'success' => true,
                    'reference_id' => $referenceId,
                    'status' => 'PENDING',
                ];
            } else {
                throw new Exception('MTN MoMo request to pay failed: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to request MTN MoMo payment', [
                'external_id' => $paymentData['external_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Check payment status
     *
     * @param string $referenceId
     * @return array
     * @throws Exception
     */
    public function checkPaymentStatus(string $referenceId): array
    {
        try {
            $token = $this->getAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
            ])->get("{$this->baseUrl}/collection/v1_0/requesttopay/{$referenceId}");

            if ($response->successful()) {
                $data = $response->json();

                Log::info('MTN MoMo payment status checked', [
                    'reference_id' => $referenceId,
                    'status' => $data['status'] ?? 'unknown',
                ]);

                return [
                    'success' => true,
                    'status' => $data['status'] ?? 'UNKNOWN',
                    'amount' => $data['amount'] ?? null,
                    'currency' => $data['currency'] ?? 'GNF',
                    'external_id' => $data['externalId'] ?? null,
                    'payer' => $data['payer'] ?? null,
                    'data' => $data,
                ];
            } else {
                throw new Exception('Failed to check MTN MoMo payment status: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to check MTN MoMo payment status', [
                'reference_id' => $referenceId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Transfer money to user
     *
     * @param array $transferData
     * @return array
     * @throws Exception
     */
    public function transfer(array $transferData): array
    {
        try {
            $token = $this->getAccessToken();
            $referenceId = Str::uuid()->toString();

            $payload = [
                'amount' => (string) $transferData['amount'],
                'currency' => 'GNF',
                'externalId' => $transferData['external_id'],
                'payee' => [
                    'partyIdType' => 'MSISDN',
                    'partyId' => $this->formatPhoneNumber($transferData['phone_number']),
                ],
                'payerMessage' => $transferData['payer_message'] ?? 'Paiement ImmoGuinée',
                'payeeNote' => $transferData['payee_note'] ?? 'Transfert pour ' . $transferData['reference'],
            ];

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Reference-Id' => $referenceId,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/disbursement/v1_0/transfer", $payload);

            if ($response->successful() || $response->status() === 202) {
                Log::info('MTN MoMo transfer requested', [
                    'reference_id' => $referenceId,
                    'external_id' => $transferData['external_id'],
                ]);

                return [
                    'success' => true,
                    'reference_id' => $referenceId,
                    'status' => 'PENDING',
                ];
            } else {
                throw new Exception('MTN MoMo transfer failed: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to transfer MTN MoMo', [
                'external_id' => $transferData['external_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Check transfer status
     *
     * @param string $referenceId
     * @return array
     * @throws Exception
     */
    public function checkTransferStatus(string $referenceId): array
    {
        try {
            $token = $this->getAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
            ])->get("{$this->baseUrl}/disbursement/v1_0/transfer/{$referenceId}");

            if ($response->successful()) {
                $data = $response->json();

                Log::info('MTN MoMo transfer status checked', [
                    'reference_id' => $referenceId,
                    'status' => $data['status'] ?? 'unknown',
                ]);

                return [
                    'success' => true,
                    'status' => $data['status'] ?? 'UNKNOWN',
                    'amount' => $data['amount'] ?? null,
                    'currency' => $data['currency'] ?? 'GNF',
                    'external_id' => $data['externalId'] ?? null,
                    'data' => $data,
                ];
            } else {
                throw new Exception('Failed to check MTN MoMo transfer status: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to check MTN MoMo transfer status', [
                'reference_id' => $referenceId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get account balance
     *
     * @return array
     * @throws Exception
     */
    public function getBalance(): array
    {
        try {
            $token = $this->getAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
            ])->get("{$this->baseUrl}/collection/v1_0/account/balance");

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'available_balance' => $data['availableBalance'] ?? null,
                    'currency' => $data['currency'] ?? 'GNF',
                ];
            } else {
                throw new Exception('Failed to get MTN MoMo balance: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to get MTN MoMo balance', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Validate account holder (check if phone number is valid)
     *
     * @param string $phoneNumber
     * @return array
     * @throws Exception
     */
    public function validateAccountHolder(string $phoneNumber): array
    {
        try {
            $token = $this->getAccessToken();
            $formattedPhone = $this->formatPhoneNumber($phoneNumber);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Target-Environment' => $this->environment,
                'Ocp-Apim-Subscription-Key' => $this->subscriptionKey,
            ])->get("{$this->baseUrl}/collection/v1_0/accountholder/msisdn/{$formattedPhone}/active");

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'is_active' => $data['result'] ?? false,
                ];
            } else {
                return [
                    'success' => false,
                    'is_active' => false,
                ];
            }
        } catch (Exception $e) {
            Log::error('Failed to validate MTN MoMo account holder', [
                'phone_number' => $phoneNumber,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Format phone number for MTN MoMo (Guinea: 224)
     *
     * @param string $phoneNumber
     * @return string
     */
    protected function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove all non-numeric characters
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);

        // Add country code if not present
        if (!str_starts_with($phoneNumber, '224')) {
            $phoneNumber = '224' . $phoneNumber;
        }

        return $phoneNumber;
    }
}
