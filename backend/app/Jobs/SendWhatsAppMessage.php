<?php

namespace App\Jobs;

use App\Models\WhatsAppMessage as WhatsAppMessageModel;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array
     */
    public $backoff = [30, 60, 120]; // 30s, 1m, 2m

    /**
     * Delete the job if its models no longer exist.
     *
     * @var bool
     */
    public $deleteWhenMissingModels = true;

    /**
     * The phone number to send to.
     */
    protected string $phoneNumber;

    /**
     * The message content.
     */
    protected string $message;

    /**
     * The message type.
     */
    protected string $type;

    /**
     * Additional metadata.
     */
    protected array $metadata;

    /**
     * The user ID (optional).
     */
    protected ?string $userId;

    /**
     * Create a new job instance.
     *
     * @param string $phoneNumber
     * @param string $message
     * @param string $type
     * @param array $metadata
     * @param string|null $userId
     */
    public function __construct(
        string $phoneNumber,
        string $message,
        string $type = 'general',
        array $metadata = [],
        ?string $userId = null
    ) {
        $this->phoneNumber = $phoneNumber;
        $this->message = $message;
        $this->type = $type;
        $this->metadata = $metadata;
        $this->userId = $userId;

        // Set queue name
        $this->onQueue('whatsapp');
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        try {
            Log::info('SendWhatsAppMessage: Starting job', [
                'phone' => $this->phoneNumber,
                'type' => $this->type,
                'attempt' => $this->attempts(),
            ]);

            $whatsAppService->send(
                $this->phoneNumber,
                $this->message,
                $this->type,
                array_merge($this->metadata, [
                    'user_id' => $this->userId,
                    'queued' => true,
                    'attempt' => $this->attempts(),
                ])
            );

            Log::info('SendWhatsAppMessage: Message sent successfully', [
                'phone' => $this->phoneNumber,
                'type' => $this->type,
            ]);

        } catch (Exception $e) {
            Log::error('SendWhatsAppMessage: Failed to send', [
                'phone' => $this->phoneNumber,
                'type' => $this->type,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
            ]);

            // Re-throw to trigger retry logic
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendWhatsAppMessage: Job failed permanently', [
            'phone' => $this->phoneNumber,
            'type' => $this->type,
            'attempts' => $this->attempts(),
            'error' => $exception->getMessage(),
        ]);

        // Update the message record if it exists
        WhatsAppMessageModel::where('phone_number', $this->phoneNumber)
            ->where('type', $this->type)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first()
            ?->markAsFailed($exception->getMessage());
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<int, string>
     */
    public function tags(): array
    {
        return [
            'whatsapp',
            'whatsapp:' . $this->type,
            'phone:' . substr($this->phoneNumber, -4), // Last 4 digits for privacy
        ];
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     */
    public function retryAfter(): int
    {
        return $this->backoff[$this->attempts() - 1] ?? 120;
    }
}
