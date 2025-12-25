<?php

namespace App\Console\Commands;

use App\Models\EncryptedMedia;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendMediaDownloadReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:send-reminders
                            {--dry-run : Show what would be sent without actually sending}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send WAHA notifications to remind recipients to download media after 3 days';

    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        parent::__construct();
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $this->info('Looking for media needing reminders...');

        // Get media that needs reminder (3+ days old, not downloaded, no reminder sent yet)
        $mediaItems = EncryptedMedia::needsReminder()
            ->with(['uploader', 'conversation.initiator', 'conversation.participant', 'conversation.listing'])
            ->get();

        if ($mediaItems->isEmpty()) {
            $this->info('No media requires reminders at this time.');
            return Command::SUCCESS;
        }

        $this->info("Found {$mediaItems->count()} media item(s) needing reminders.");

        $sent = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($mediaItems as $media) {
            try {
                // Get recipient (the person who should download)
                $recipient = $media->getRecipient();

                if (!$recipient) {
                    $this->warn("  [SKIP] Media {$media->id}: No recipient found");
                    $skipped++;
                    continue;
                }

                if (!$recipient->telephone) {
                    $this->warn("  [SKIP] Media {$media->id}: Recipient has no phone number");
                    $skipped++;
                    continue;
                }

                // Get sender name
                $senderName = $media->uploader?->nom_complet ?? 'Un utilisateur';

                // Get media type label
                $mediaTypeLabel = $media->getMediaTypeLabel();

                // Build conversation URL
                $conversationUrl = config('app.frontend_url') . '/messages/' . $media->conversation_id;

                $this->line("  Processing: Media {$media->id}");
                $this->line("    - Type: {$mediaTypeLabel}");
                $this->line("    - Sender: {$senderName}");
                $this->line("    - Recipient: {$recipient->nom_complet} ({$recipient->telephone})");
                $this->line("    - Created: {$media->created_at->diffForHumans()}");

                if ($dryRun) {
                    $this->info("    [DRY RUN] Would send reminder to {$recipient->telephone}");
                    $sent++;
                    continue;
                }

                // Send WAHA notification
                $this->whatsAppService->sendMediaDownloadReminder(
                    $recipient->telephone,
                    $senderName,
                    $mediaTypeLabel,
                    $conversationUrl
                );

                // Mark reminder as sent
                $media->markReminderSent();

                Log::info('Media download reminder sent', [
                    'media_id' => $media->id,
                    'media_type' => $media->media_type,
                    'recipient_id' => $recipient->id,
                    'recipient_phone' => $recipient->telephone,
                ]);

                $this->info("    [SENT] Reminder sent successfully");
                $sent++;

            } catch (\Exception $e) {
                Log::error('Failed to send media download reminder', [
                    'media_id' => $media->id,
                    'error' => $e->getMessage(),
                ]);

                $this->error("    [FAILED] {$e->getMessage()}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->info("  - Sent: {$sent}");
        $this->info("  - Failed: {$failed}");
        $this->info("  - Skipped: {$skipped}");

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
