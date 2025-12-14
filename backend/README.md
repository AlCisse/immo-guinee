# ImmoGuinée Backend API - Laravel 12

Backend API for the ImmoGuinée real estate platform in Guinea.

## Tech Stack

- **Laravel 12** (PHP 8.2+)
- **Laravel Passport** - OAuth2 authentication
- **PostgreSQL 15+** with PostGIS - Geospatial database
- **Redis 7+** - Cache, sessions, queues, broadcasting
- **Elasticsearch** - Advanced search with Laravel Scout
- **Laravel Echo** - Real-time broadcasting
- **Laravel Horizon** - Queue monitoring

## Prerequisites

- PHP 8.2+
- Composer 2.x
- Docker & Docker Compose

## Installation

1. Copy environment file:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
composer install
```

3. Generate application key:
```bash
php artisan key:generate
```

4. Run migrations:
```bash
php artisan migrate
```

5. Install Laravel Passport:
```bash
php artisan passport:install
```

6. Seed database (optional):
```bash
php artisan db:seed
```

## Development

Start the development server:
```bash
php artisan serve
```

Start queue worker:
```bash
php artisan queue:work
```

Start Laravel Horizon:
```bash
php artisan horizon
```

## Testing

Run tests:
```bash
php artisan test
```

Run with coverage:
```bash
php artisan test --coverage
```

## API Documentation

API documentation is available at `/api/documentation` when the server is running.

## Project Structure

```
app/
├── Console/Commands/     # Artisan commands
├── Events/              # Broadcasting events
├── Exceptions/          # Exception handlers
├── Http/
│   ├── Controllers/Api/ # API controllers
│   ├── Middleware/      # Custom middleware
│   └── Requests/        # Form request validators
├── Jobs/                # Queue jobs
├── Models/              # Eloquent models
├── Notifications/       # Notification classes
├── Providers/           # Service providers
├── Repositories/        # Repository pattern
└── Services/            # Business logic services

database/
├── factories/           # Model factories
├── migrations/          # Database migrations
└── seeders/             # Database seeders

routes/
├── api.php             # API routes
├── channels.php        # Broadcasting channels
├── console.php         # Console routes & schedules
└── web.php             # Web routes

storage/
├── app/
│   ├── listings/       # Listing photos
│   ├── contracts/      # Generated contracts (PDF)
│   └── certifications/ # CNI, titre foncier uploads
├── framework/
└── logs/
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DB_*` - PostgreSQL connection
- `REDIS_*` - Redis configuration
- `ELASTICSEARCH_*` - Elasticsearch settings
- `PASSPORT_*` - OAuth2 settings
- `AWS_*` - MinIO/S3 storage
- `TWILIO_*` - SMS notifications
- `WAHA_*` - WhatsApp notifications

## License

Proprietary - ImmoGuinée Platform
