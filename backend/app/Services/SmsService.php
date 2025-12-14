<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Exception;

class SmsService
{
    /**
     * Twilio Account SID
     */
    protected $accountSid;

    /**
     * Twilio Auth Token
     */
    protected $authToken;

    /**
     * Twilio Phone Number
     */
    protected $fromNumber;

    public function __construct()
    {
        $this->accountSid = config('services.twilio.account_sid');
        $this->authToken = config('services.twilio.auth_token');
        $this->fromNumber = config('services.twilio.from_number');
    }

    /**
     * Send SMS via Twilio
     *
     * @param string $to
     * @param string $message
     * @return array
     * @throws Exception
     */
    public function send(string $to, string $message): array
    {
        // Validate configuration
        if (!$this->accountSid || !$this->authToken || !$this->fromNumber) {
            throw new Exception('Twilio credentials not configured');
        }

        // Format phone number (ensure it starts with +224 for Guinea)
        $to = $this->formatPhoneNumber($to);

        try {
            // Twilio API endpoint
            $url = "https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Messages.json";

            // Send request to Twilio
            $response = Http::withBasicAuth($this->accountSid, $this->authToken)
                ->asForm()
                ->post($url, [
                    'To' => $to,
                    'From' => $this->fromNumber,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('SMS sent successfully', [
                    'to' => $to,
                    'sid' => $data['sid'] ?? null,
                    'status' => $data['status'] ?? null,
                ]);

                return [
                    'success' => true,
                    'message_sid' => $data['sid'] ?? null,
                    'status' => $data['status'] ?? null,
                ];
            } else {
                throw new Exception('Twilio API error: ' . $response->body());
            }
        } catch (Exception $e) {
            Log::error('Failed to send SMS', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Format phone number for Guinea (+224)
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

        // Add + prefix for E.164 format
        return '+' . $phoneNumber;
    }

    /**
     * Send bulk SMS (for notifications)
     *
     * @param array $recipients Array of phone numbers
     * @param string $message
     * @return array
     */
    public function sendBulk(array $recipients, string $message): array
    {
        $results = [
            'success' => [],
            'failed' => [],
        ];

        foreach ($recipients as $recipient) {
            try {
                $result = $this->send($recipient, $message);
                $results['success'][] = [
                    'phone' => $recipient,
                    'sid' => $result['message_sid'] ?? null,
                ];
            } catch (Exception $e) {
                $results['failed'][] = [
                    'phone' => $recipient,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }
}
