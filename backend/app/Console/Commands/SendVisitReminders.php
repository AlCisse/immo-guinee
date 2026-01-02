<?php

namespace App\Console\Commands;

use App\Models\Visit;
use App\Models\Notification as AppNotification;
use App\Services\WhatsAppService;
use App\Services\ExpoPushService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendVisitReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'visits:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send reminders for upcoming visits (24h and 12h before)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for visits needing reminders...');

        $now = Carbon::now(config('app.timezone', 'Africa/Conakry'));

        // Use standardized English status values (as per Visit model scopes)
        $activeStatuses = ['CONFIRMED', 'PENDING'];

        // Get visits in the next 24-25 hours that haven't received 24h reminder
        // Using date + time::interval for proper PostgreSQL datetime arithmetic
        $visits24h = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->whereIn('statut', $activeStatuses)
            ->where('reminder_24h_sent', false)
            ->whereRaw("(date_visite + heure_visite::time) BETWEEN ? AND ?", [
                $now->copy()->addHours(23)->format('Y-m-d H:i:s'),
                $now->copy()->addHours(25)->format('Y-m-d H:i:s'),
            ])
            ->lockForUpdate()
            ->get();

        // Get visits in the next 11-13 hours that haven't received 12h reminder
        $visits12h = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->whereIn('statut', $activeStatuses)
            ->where('reminder_12h_sent', false)
            ->whereRaw("(date_visite + heure_visite::time) BETWEEN ? AND ?", [
                $now->copy()->addHours(11)->format('Y-m-d H:i:s'),
                $now->copy()->addHours(13)->format('Y-m-d H:i:s'),
            ])
            ->lockForUpdate()
            ->get();

        $sent24h = 0;
        $sent12h = 0;

        // Send 24h reminders with transaction to prevent race conditions
        foreach ($visits24h as $visit) {
            try {
                DB::transaction(function () use ($visit, &$sent24h) {
                    // Double-check flag within transaction
                    $freshVisit = Visit::lockForUpdate()->find($visit->id);
                    if ($freshVisit && !$freshVisit->reminder_24h_sent) {
                        $freshVisit->update(['reminder_24h_sent' => true]);
                        $this->sendReminder($visit, '24h');
                        $sent24h++;
                    }
                });
            } catch (\Exception $e) {
                Log::error('[VISIT_REMINDER] Failed to send 24h reminder', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Send 12h reminders with transaction
        foreach ($visits12h as $visit) {
            try {
                DB::transaction(function () use ($visit, &$sent12h) {
                    $freshVisit = Visit::lockForUpdate()->find($visit->id);
                    if ($freshVisit && !$freshVisit->reminder_12h_sent) {
                        $freshVisit->update(['reminder_12h_sent' => true]);
                        $this->sendReminder($visit, '12h');
                        $sent12h++;
                    }
                });
            } catch (\Exception $e) {
                Log::error('[VISIT_REMINDER] Failed to send 12h reminder', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Sent {$sent24h} 24h reminders and {$sent12h} 12h reminders.");

        return Command::SUCCESS;
    }

    /**
     * Send reminder to both parties
     */
    protected function sendReminder(Visit $visit, string $type): void
    {
        $listing = $visit->listing;
        $visitDate = $visit->date_visite->format('d/m/Y');
        $visitTime = $visit->heure_visite->format('H:i');
        $timeLabel = $type === '24h' ? 'demain' : "dans {$type}";

        $whatsApp = app(WhatsAppService::class);
        $pushService = app(ExpoPushService::class);

        // ====== NOTIFY VISITOR/CLIENT ======
        $visitor = $visit->visiteur;
        $visitorPhone = $visit->client_telephone;
        $ownerName = $visit->proprietaire?->nom_complet ?? 'le propriétaire';

        $visitorMessage = "⏰ *Rappel de visite - ImmoGuinée*\n\n";
        $visitorMessage .= "Votre visite est prévue {$timeLabel} !\n\n";
        $visitorMessage .= "🏠 *Bien:* {$listing->titre}\n";
        $visitorMessage .= "📍 *Adresse:* {$listing->quartier}, {$listing->commune}\n";
        $visitorMessage .= "📆 *Date:* {$visitDate}\n";
        $visitorMessage .= "🕐 *Heure:* {$visitTime}\n";
        $visitorMessage .= "👤 *Propriétaire:* {$ownerName}\n\n";
        $visitorMessage .= "_N'oubliez pas d'être présent à l'heure convenue._";

        // WhatsApp to visitor
        if ($visitorPhone) {
            try {
                $whatsApp->send($visitorPhone, $visitorMessage, 'visit_reminder', [
                    'visit_id' => $visit->id,
                    'reminder_type' => $type,
                ]);
            } catch (\Exception $e) {
                Log::warning('[VISIT_REMINDER] WhatsApp to visitor failed', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Push to visitor
        if ($visitor) {
            try {
                $pushService->send(
                    $visitor,
                    'Rappel de visite',
                    "Visite de \"{$listing->titre}\" {$timeLabel} à {$visitTime}",
                    [
                        'type' => 'visit_reminder',
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                    ],
                    'visits'
                );
            } catch (\Exception $e) {
                Log::warning('[VISIT_REMINDER] Push to visitor failed', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // In-app notification for visitor
            try {
                AppNotification::notify(
                    $visitor,
                    'visit_reminder',
                    'Rappel de visite',
                    "Votre visite de \"{$listing->titre}\" est prévue {$timeLabel} à {$visitTime}",
                    [
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'reminder_type' => $type,
                    ],
                    '/my-visits'
                );
            } catch (\Exception $e) {
                Log::warning('[VISIT_REMINDER] In-app notification to visitor failed', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // ====== NOTIFY OWNER ======
        $owner = $visit->proprietaire;
        $clientName = $visit->client_nom;

        if ($owner) {
            $ownerMessage = "⏰ *Rappel de visite - ImmoGuinée*\n\n";
            $ownerMessage .= "Une visite est prévue {$timeLabel} !\n\n";
            $ownerMessage .= "🏠 *Bien:* {$listing->titre}\n";
            $ownerMessage .= "📍 *Adresse:* {$listing->quartier}, {$listing->commune}\n";
            $ownerMessage .= "📆 *Date:* {$visitDate}\n";
            $ownerMessage .= "🕐 *Heure:* {$visitTime}\n";
            $ownerMessage .= "👤 *Visiteur:* {$clientName}\n";
            $ownerMessage .= "📞 *Téléphone:* {$visitorPhone}\n\n";
            $ownerMessage .= "_Préparez-vous à accueillir le visiteur._";

            // WhatsApp to owner
            if ($owner->telephone) {
                try {
                    $whatsApp->send($owner->telephone, $ownerMessage, 'visit_reminder', [
                        'visit_id' => $visit->id,
                        'reminder_type' => $type,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('[VISIT_REMINDER] WhatsApp to owner failed', [
                        'visit_id' => $visit->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Push to owner
            try {
                $pushService->send(
                    $owner,
                    'Rappel de visite',
                    "Visite de \"{$listing->titre}\" par {$clientName} {$timeLabel} à {$visitTime}",
                    [
                        'type' => 'visit_reminder',
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                    ],
                    'visits'
                );
            } catch (\Exception $e) {
                Log::warning('[VISIT_REMINDER] Push to owner failed', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // In-app notification for owner
            try {
                AppNotification::notify(
                    $owner,
                    'visit_reminder',
                    'Rappel de visite',
                    "Visite de \"{$listing->titre}\" par {$clientName} {$timeLabel} à {$visitTime}",
                    [
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'reminder_type' => $type,
                    ],
                    '/my-visits'
                );
            } catch (\Exception $e) {
                Log::warning('[VISIT_REMINDER] In-app notification to owner failed', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('[VISIT_REMINDER] Reminder sent', [
            'visit_id' => $visit->id,
            'type' => $type,
        ]);
    }
}
