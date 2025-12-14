# WhatsApp Notification System via WAHA

## Overview

ImmoGuinee uses WAHA (WhatsApp HTTP API) for sending WhatsApp notifications. This document describes the architecture, configuration, and usage of the WhatsApp notification system.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Laravel App    │────▶│  WhatsAppService │────▶│  WAHA Server   │
│  (Notifications)│     │  (Queue Handler) │     │  (Docker)      │
└─────────────────┘     └──────────────────┘     └────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌──────────────────┐     ┌────────────────┐
                        │ WhatsAppMessage  │     │    WhatsApp    │
                        │   (Database)     │     │    (User)      │
                        └──────────────────┘     └────────────────┘
```

## Configuration

### Environment Variables

```env
# WAHA Configuration
WAHA_URL=http://immog-waha:3000
WAHA_API_KEY=immog2024
WAHA_SESSION_NAME=default
```

### Config File

Configuration is stored in `config/services.php`:

```php
'waha' => [
    'url' => env('WAHA_URL', 'http://immog-waha:3000'),
    'api_key' => env('WAHA_API_KEY', 'immog2024'),
    'session_name' => env('WAHA_SESSION_NAME', 'default'),
],
```

## Components

### 1. WhatsAppService (`app/Services/WhatsAppService.php`)

Main service for sending WhatsApp messages. Features:
- Automatic session management and reconnection
- Message status tracking
- Support for text, image, and file messages
- Phone number formatting for Guinea (+224)

### 2. WahaChannel (`app/Channels/WahaChannel.php`)

Laravel Notification Channel for WhatsApp. Allows using Laravel's notification system:

```php
$user->notify(new OtpNotification('123456'));
```

### 3. WhatsAppMessage Model (`app/Models/WhatsAppMessage.php`)

Database model for tracking message status:
- `pending` - Message queued
- `sent` - Message sent to WAHA
- `delivered` - Message delivered to recipient
- `read` - Message read by recipient
- `failed` - Message failed to send

### 4. SendWhatsAppMessage Job (`app/Jobs/SendWhatsAppMessage.php`)

Queued job for async message sending with:
- 3 retry attempts
- Exponential backoff (30s, 60s, 120s)
- Failure logging

## Usage

### Direct Service Usage

```php
use App\Services\WhatsAppService;

$whatsApp = app(WhatsAppService::class);

// Send OTP
$whatsApp->sendOTP('621234567', '123456');

// Send custom message
$whatsApp->send('621234567', 'Hello from ImmoGuinee!', 'custom');

// Send with image
$whatsApp->sendImage('621234567', 'https://example.com/image.jpg', 'Caption');
```

### Using Notifications

```php
use App\Notifications\OtpNotification;
use App\Notifications\PaymentNotification;

// Send OTP
$user->notify(new OtpNotification('123456'));

// Send payment confirmation
$user->notify(new PaymentNotification('50000', 'PAY-123', 'confirmed'));
```

### Bulk Messages

```php
$whatsApp = app(WhatsAppService::class);

$recipients = ['621234567', '622345678', '623456789'];
$whatsApp->sendBulk($recipients, 'Bulk message content');
```

## Available Notifications

| Notification | Description |
|--------------|-------------|
| `OtpNotification` | Send OTP codes |
| `AccountVerifiedNotification` | Account verification success |
| `NewMessageNotification` | New message received |
| `ContractNotification` | Contract status updates |
| `PaymentNotification` | Payment confirmations |
| `ListingExpirationNotification` | Listing expiry reminders |
| `VisitConfirmationNotification` | Property visit confirmations |
| `WelcomeNotification` | Welcome message for new users |

## Creating Custom Notifications

```php
<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Notifications\Notification;

class CustomNotification extends Notification
{
    public function via($notifiable): array
    {
        return [WahaChannel::class];
    }

    public function toWhatsApp($notifiable): WhatsAppMessage
    {
        return WhatsAppMessage::create()
            ->bold("Title Here")
            ->emptyLine()
            ->line("Message content")
            ->emptyLine()
            ->action("Click here", "https://example.com")
            ->type('custom')
            ->metadata(['key' => 'value']);
    }
}
```

## WhatsAppMessage Builder Methods

| Method | Description |
|--------|-------------|
| `content(string)` | Set message content |
| `line(string)` | Add a line |
| `emptyLine()` | Add empty line |
| `bold(string)` | Add bold text (*text*) |
| `italic(string)` | Add italic text (_text_) |
| `greeting(string)` | Add "Bonjour {name}," |
| `salutation(string)` | Add closing salutation |
| `action(string, url)` | Add call-to-action link |
| `type(string)` | Set message type |
| `metadata(array)` | Set metadata |

## API Endpoints

### Webhooks (Public)

```
POST /api/webhooks/waha
```

Receives WAHA webhook events for message status updates.

### Session Management (Admin)

```
GET  /api/waha/status         - Get session status
GET  /api/waha/qr-code        - Get QR code for authentication
POST /api/waha/session/start  - Start/restart session
POST /api/waha/session/stop   - Stop session
```

## Database Migration

Run migration to create the `whatsapp_messages` table:

```bash
php artisan migrate
```

## Queue Configuration

Messages are sent via the `whatsapp` queue. Ensure queue worker is running:

```bash
php artisan queue:work --queue=whatsapp
```

## Session Management

### Auto-Reconnection

The service automatically attempts to reconnect if the session drops:

1. Before each message, `ensureSessionReady()` checks session status
2. If not ready, it clears cache and attempts to start session
3. Waits 2 seconds for session to stabilize
4. Throws exception if session still not ready

### Webhook Events

WAHA sends the following events:
- `message` - Incoming message
- `message.ack` - Message status update (sent/delivered/read)
- `session.status` - Session status change

## Troubleshooting

### Session Not Ready

1. Check WAHA container is running: `docker logs immog-waha`
2. Check session status: `GET /api/waha/status`
3. Get QR code if needed: `GET /api/waha/qr-code`
4. Scan QR code with WhatsApp

### Messages Not Sending

1. Check queue worker is running
2. Check `whatsapp_messages` table for status
3. Check Laravel logs for errors
4. Verify WAHA URL is accessible

### Messages Stuck as Pending

1. Ensure queue worker is processing `whatsapp` queue
2. Check for failed jobs: `php artisan queue:failed`
3. Retry failed jobs: `php artisan queue:retry all`

## Security Considerations

1. **Phone Number Validation**: All phone numbers are formatted and validated
2. **Rate Limiting**: Built-in delays for bulk messages (500ms between messages)
3. **API Key**: WAHA API is protected with API key
4. **Webhook Security**: Webhook endpoint should be restricted to WAHA container IP

## Future Enhancements

- [ ] Template messages support
- [ ] Interactive buttons/lists
- [ ] Media optimization (compression)
- [ ] Message analytics dashboard
- [ ] Scheduled messages
