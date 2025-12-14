<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

class OrangeMoneyService
{
    /**
     * Merchant ID
     */
    protected $merchantId;

    /**
     * API Key
     */
    protected $apiKey;

    /**
     * API Secret
     */
    protected $apiSecret;

    /**
     * Base URL
     */
    protected $baseUrl;

    /**
     * Access Token
     */
    protected $accessToken;

    public function __construct()
    {
        $this->merchantId = config('services.orange_money.merchant_id');
        $this->apiKey = config('services.orange_money.api_key');
        $this->apiSecret = config('services.orange_money.api_secret');
        $this->baseUrl = config('services.orange_money.base_url');
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
        $cachedToken = Cache::get('orange_money_access_token');
        if ($cachedToken) {
            return $cachedToken;
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth($this->apiKey, $this->apiSecret)
                ->post("{$this->baseUrl}/oauth/v3/token", [
                    'grant_type' => 'client_credentials',
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $token = $data['access_token'];
                $expiresIn = $data['expires_in'] ?? 3600;

                // Cache token for slightly less than expiry time
                Cache::put('orange_money_access_token', $token, now()->addSeconds($expiresIn - 60));

                return $token;
            } else {
                throw new Exception('Failed to get Orange Money access token: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Orange Money authentication failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Initiate payment
     *
     * @param array $paymentData
     * @return array
     * @throws Exception
     */
    public function initiatePayment(array $paymentData): array
    {
        try {
            $token = $this->getAccessToken();

            $payload = [
                'merchant_key' => $this->merchantId,
                'currency' => 'GNF',
                'order_id' => $paymentData['order_id'],
                'amount' => $paymentData['amount'],
                'return_url' => $paymentData['return_url'] ?? config('app.frontend_url') . '/payment/callback',
                'cancel_url' => $paymentData['cancel_url'] ?? config('app.frontend_url') . '/payment/cancel',
                'notif_url' => $paymentData['notif_url'] ?? config('app.url') . '/api/webhooks/orange',
                'lang' => 'fr',
                'reference' => $paymentData['reference'],
            ];

            $response = Http::withToken($token)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post("{$this->baseUrl}/omcoreapis/1.0.2/mp/pay", $payload);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Orange Money payment initiated', [
                    'order_id' => $paymentData['order_id'],
                    'pay_token' => $data['pay_token'] ?? null,
                ]);

                return [
                    'success' => true,
                    'pay_token' => $data['pay_token'] ?? null,
                    'payment_url' => $data['payment_url'] ?? null,
                    'notif_token' => $data['notif_token'] ?? null,
                    'data' => $data,
                ];
            } else {
                throw new Exception('Orange Money payment initiation failed: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to initiate Orange Money payment', [
                'order_id' => $paymentData['order_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Check payment status
     *
     * @param string $payToken
     * @return array
     * @throws Exception
     */
    public function checkPaymentStatus(string $payToken): array
    {
        try {
            $token = $this->getAccessToken();

            $response = Http::withToken($token)
                ->get("{$this->baseUrl}/omcoreapis/1.0.2/mp/paymentstatus/{$payToken}");

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Orange Money payment status checked', [
                    'pay_token' => $payToken,
                    'status' => $data['status'] ?? 'unknown',
                ]);

                return [
                    'success' => true,
                    'status' => $data['status'] ?? 'unknown',
                    'order_id' => $data['order_id'] ?? null,
                    'amount' => $data['amount'] ?? null,
                    'data' => $data,
                ];
            } else {
                throw new Exception('Failed to check Orange Money payment status: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to check Orange Money payment status', [
                'pay_token' => $payToken,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Process webhook notification
     *
     * @param array $webhookData
     * @return array
     */
    public function processWebhook(array $webhookData): array
    {
        Log::info('Orange Money webhook received', $webhookData);

        return [
            'order_id' => $webhookData['order_id'] ?? null,
            'reference' => $webhookData['reference'] ?? null,
            'status' => $webhookData['status'] ?? 'unknown',
            'amount' => $webhookData['amount'] ?? null,
            'currency' => $webhookData['currency'] ?? 'GNF',
            'pay_token' => $webhookData['pay_token'] ?? null,
            'txnid' => $webhookData['txnid'] ?? null,
        ];
    }

    /**
     * Validate webhook signature
     *
     * @param array $data
     * @param string $signature
     * @return bool
     */
    public function validateWebhookSignature(array $data, string $signature): bool
    {
        $computedSignature = hash_hmac('sha256', json_encode($data), $this->apiSecret);
        return hash_equals($computedSignature, $signature);
    }

    /**
     * Request payout (transfer money to user)
     *
     * @param array $payoutData
     * @return array
     * @throws Exception
     */
    public function requestPayout(array $payoutData): array
    {
        try {
            $token = $this->getAccessToken();

            $payload = [
                'merchant_key' => $this->merchantId,
                'currency' => 'GNF',
                'order_id' => $payoutData['order_id'],
                'amount' => $payoutData['amount'],
                'receive_msisdn' => $payoutData['phone_number'],
                'notif_url' => $payoutData['notif_url'] ?? config('app.url') . '/api/webhooks/orange/payout',
                'reference' => $payoutData['reference'],
            ];

            $response = Http::withToken($token)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post("{$this->baseUrl}/omcoreapis/1.0.2/mp/payout", $payload);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Orange Money payout requested', [
                    'order_id' => $payoutData['order_id'],
                    'status' => $data['status'] ?? 'unknown',
                ]);

                return [
                    'success' => true,
                    'txnid' => $data['txnid'] ?? null,
                    'status' => $data['status'] ?? 'pending',
                    'data' => $data,
                ];
            } else {
                throw new Exception('Orange Money payout failed: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to request Orange Money payout', [
                'order_id' => $payoutData['order_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get transaction details
     *
     * @param string $transactionId
     * @return array
     * @throws Exception
     */
    public function getTransactionDetails(string $transactionId): array
    {
        try {
            $token = $this->getAccessToken();

            $response = Http::withToken($token)
                ->get("{$this->baseUrl}/omcoreapis/1.0.2/mp/transactions/{$transactionId}");

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'transaction' => $data,
                ];
            } else {
                throw new Exception('Failed to get transaction details: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to get Orange Money transaction details', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Format phone number for Orange Money (Guinea: 224)
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
