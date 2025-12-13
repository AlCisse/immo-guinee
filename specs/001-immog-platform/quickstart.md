# Developer Quickstart Guide: ImmoGuinée Platform (Laravel 11)

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28
**Estimated Setup Time**: 40-60 minutes

---

## Overview

This guide walks you through setting up the ImmoGuinée development environment using **Laravel 11** backend + **Next.js 14** frontend. By the end, you'll have a fully functional local instance with all services running.

**What You'll Build**:
- Laravel 11 API backend (PHP 8.2+)
- Next.js 14 frontend PWA (TypeScript)
- PostgreSQL 15 database with seeded data
- Redis 7 cache + queue
- Meilisearch (advanced search)
- n8n automation workflows
- WAHA (WhatsApp) local instance
- MinIO (S3-compatible storage)
- Grafana + Prometheus monitoring
- Laravel Echo Server (WebSocket)

---

## Prerequisites

### Required Software

1. **Docker Desktop** (for Laravel Sail)
   ```bash
   docker --version  # Should output 24.x.x or higher
   ```
   Download: https://www.docker.com/products/docker-desktop

2. **Git**
   ```bash
   git --version
   ```

3. **Node.js 20 LTS** (for Next.js frontend)
   ```bash
   node --version  # Should output v20.x.x
   ```
   Download: https://nodejs.org/

4. **pnpm 8+** (for Next.js frontend)
   ```bash
   npm install -g pnpm
   pnpm --version  # Should output 8.x.x or 9.x.x
   ```

### Recommended Tools

- **VS Code** with extensions:
  - Laravel Extension Pack
  - PHP Intelephense
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
- **Postman** or **Insomnia** (API testing)
- **TablePlus** or **DBeaver** (Database GUI)
- **Laravel Herd** (optional, for running Laravel without Docker)

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/immoguinee.git
cd immoguinee
git checkout 001-immog-platform
```

---

## Step 2: Backend Setup (Laravel 11)

### 2.1 Install Laravel Dependencies

Navigate to backend directory:

```bash
cd backend
```

**If you have PHP 8.2+ installed locally**:
```bash
composer install
```

**If you don't have PHP installed** (use Laravel Sail to install dependencies):
```bash
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    laravelsail/php82-composer:latest \
    composer install --ignore-platform-reqs
```

**Expected output**: ~200 Laravel packages installed (~3-5 minutes)

---

### 2.2 Configure Environment

Copy example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# App
APP_NAME=ImmoGuinée
APP_ENV=local
APP_KEY=  # Will be generated in next step
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database (PostgreSQL via Sail)
DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_PORT=5432
DB_DATABASE=immoguinee
DB_USERNAME=sail
DB_PASSWORD=password

# Redis (via Sail)
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Meilisearch (via Sail)
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_KEY=

# Queue
QUEUE_CONNECTION=redis

# Cache
CACHE_DRIVER=redis

# Session
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# Broadcasting (Laravel Echo)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=immoguinee
PUSHER_APP_KEY=immoguinee-key
PUSHER_APP_SECRET=immoguinee-secret
PUSHER_APP_CLUSTER=mt1
PUSHER_SCHEME=http
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001

# AWS S3 (use MinIO for local dev)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=immoguinee-dev
AWS_ENDPOINT=http://minio:9000
AWS_USE_PATH_STYLE_ENDPOINT=true

# Twilio SMS (for OTP)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Resend Email
MAIL_MAILER=resend
RESEND_API_KEY=re_xxx

# WAHA (WhatsApp)
WAHA_URL=http://waha:3001
WAHA_API_KEY=your-waha-secret

# Orange Money (Sandbox)
ORANGE_MONEY_API_KEY=sandbox-key
ORANGE_MONEY_API_SECRET=sandbox-secret
ORANGE_MONEY_MERCHANT_ID=test-merchant

# MTN Mobile Money (Sandbox)
MTN_MOMO_API_KEY=sandbox-key
MTN_MOMO_API_SECRET=sandbox-secret

# ImmoGuinée Platform Account ID
IMMOG_PLATFORM_ACCOUNT_ID=  # Will be set after seeding

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,127.0.0.1:3000
```

Generate application key:

```bash
./vendor/bin/sail artisan key:generate
```

---

### 2.3 Start Laravel Sail (Docker)

Laravel Sail is a light-weight CLI for Docker. Start all services:

```bash
./vendor/bin/sail up -d
```

**Services Started**:
| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| Laravel API | 8000 | http://localhost:8000 | - |
| PostgreSQL | 5432 | localhost:5432 | sail/password |
| Redis | 6379 | localhost:6379 | (no auth) |
| Meilisearch | 7700 | http://localhost:7700 | (no auth) |
| MinIO | 9000, 9001 | http://localhost:9001 | minioadmin/minioadmin |
| Mailpit | 1025, 8025 | http://localhost:8025 | (no auth) |

Verify all services are running:

```bash
./vendor/bin/sail ps
```

**Expected output**: All containers show `Up` status.

**Alias (Optional)**:
To avoid typing `./vendor/bin/sail` every time, add this to your `.bashrc` or `.zshrc`:

```bash
alias sail='[ -f sail ] && sh sail || sh vendor/bin/sail'
```

Then you can just use:
```bash
sail up -d
sail artisan migrate
```

---

### 2.4 Run Database Migrations

```bash
sail artisan migrate
```

This will:
1. Create the `immoguinee` database
2. Run all migrations from `database/migrations/`
3. Create 11 tables (users, listings, contracts, payments, etc.)
4. Create PostgreSQL native enums
5. Create indexes for performance

**Expected output**:
```
Migration table created successfully.
Migrating: 2025_01_28_000001_create_enums
Migrated:  2025_01_28_000001_create_enums (123.45ms)
Migrating: 2025_01_28_000002_create_users_table
Migrated:  2025_01_28_000002_create_users_table (234.56ms)
...
```

---

### 2.5 Seed Database

Populate with test data:

```bash
sail artisan db:seed
```

This creates:
- 1 admin user: `+224622000000` / `admin123`
- 5 test users with various badges (Bronze, Argent, Or, Diamant)
- 20 sample listings (Kaloum, Dixinn, Ratoma)
- Pre-seeded enum values

**Verify**:

```bash
sail artisan tinker
```

Then in Tinker:
```php
User::count()  // Should output 6
Listing::count()  // Should output 20
exit
```

Or use a database GUI:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `immoguinee`
- **User**: `sail`
- **Password**: `password`

---

### 2.6 Index Data in Meilisearch

```bash
sail artisan scout:import "App\Models\Listing"
sail artisan scout:import "App\Models\User"
```

**Expected output**:
```
Imported [App\Models\Listing] models up to ID: 20
All [App\Models\Listing] records have been imported.
```

---

## Step 3: Frontend Setup (Next.js 14)

Open a **new terminal** and navigate to frontend:

```bash
cd ../frontend
```

### 3.1 Install Dependencies

```bash
pnpm install
```

This installs:
- Next.js 14
- React 18
- TailwindCSS 3
- React Query (TanStack Query v5)
- Laravel Echo (for WebSocket)
- Socket.IO Client
- shadcn/ui components
- ~100 total packages

**Estimated time**: 2-4 minutes

---

### 3.2 Configure Environment

Copy example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:6001

# Laravel Echo
NEXT_PUBLIC_PUSHER_APP_KEY=immoguinee-key
NEXT_PUBLIC_PUSHER_APP_CLUSTER=mt1
NEXT_PUBLIC_ECHO_HOST=localhost
NEXT_PUBLIC_ECHO_PORT=6001

# App
NEXT_PUBLIC_APP_NAME=ImmoGuinée
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 3.3 Start Next.js Development Server

```bash
pnpm dev
```

**Output**:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.8s
```

**Verify**:
1. Open http://localhost:3000
2. You should see the ImmoGuinée homepage
3. Latest listings should load (from seed data via API)

---

## Step 4: Additional Services Setup

### 4.1 Start n8n (Automation)

Open a **new terminal**:

```bash
cd docker
docker-compose up -d n8n
```

1. Open n8n: http://localhost:5678
2. Create account (first time only)
3. Import workflows:
   - Click **Import from File**
   - Navigate to `n8n/workflows/`
   - Import all 6 JSON files:
     - `nouvelle-annonce-notifications.json`
     - `nouveau-message-alerts.json`
     - `signature-contrat-pdf.json`
     - `paiement-quittance.json`
     - `rappels-paiement.json`
     - `expiration-annonces.json`

4. Activate each workflow:
   - Click workflow
   - Toggle **Active** switch

---

### 4.2 Start WAHA (WhatsApp)

```bash
docker-compose up -d waha
```

1. Open WAHA: http://localhost:3001
2. Scan QR code with WhatsApp
3. Update `.env` with your API key

---

### 4.3 Configure MinIO (S3 Storage)

1. Open MinIO Console: http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Create bucket:
   - Click **Create Bucket**
   - Name: `immoguinee-dev`
   - Region: `us-east-1`
   - Click **Create**

4. Set bucket policy (public read for listing photos):
   - Select bucket → **Manage** → **Access Policy**
   - Add policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {"AWS": ["*"]},
         "Action": ["s3:GetObject"],
         "Resource": ["arn:aws:s3:::immoguinee-dev/listings/*"]
       }
     ]
   }
   ```

---

### 4.4 Start Laravel Echo Server (WebSocket)

Open a **new terminal** in `backend/`:

```bash
npm install -g laravel-echo-server
laravel-echo-server init  # Only first time
laravel-echo-server start
```

**Configuration** (when prompted):
- **Port**: `6001`
- **Protocol**: `http`
- **Database**: `redis`
- **Redis Host**: `127.0.0.1`
- **Redis Port**: `6379`

**Expected output**:
```
L A R A V E L  E C H O  S E R V E R

version 1.6.3

⚠ Starting server in DEV mode...

✔  Running at localhost on port 6001
✔  Channels are ready.
✔  Listening for http events...
✔  Listening for redis events...

Server ready!
```

---

### 4.5 Start Queue Worker (Background Jobs)

Open a **new terminal** in `backend/`:

```bash
sail artisan queue:work
```

This processes:
- Photo optimization jobs (OptimizeListingPhotosJob)
- Email notifications
- PDF generation
- Payment processing

**Expected output**:
```
[2025-01-28 14:30:00][1] Processing: App\Jobs\OptimizeListingPhotosJob
[2025-01-28 14:30:05][1] Processed:  App\Jobs\OptimizeListingPhotosJob
```

---

### 4.6 Start Grafana + Prometheus (Monitoring)

```bash
cd docker
docker-compose up -d grafana prometheus
```

1. Open Grafana: http://localhost:3002
2. Login: `admin` / `admin`
3. Import dashboard:
   - Click **Dashboards** → **Import**
   - Upload `grafana/dashboards/immog-dashboard.json`

---

## Step 5: Verify Setup (Smoke Tests)

### Test 1: Laravel API Health Check

```bash
curl http://localhost:8000/api/health
```

**Expected**:
```json
{"success":true,"status":"healthy","timestamp":"2025-01-28T14:30:00Z"}
```

---

### Test 2: User Registration (Laravel)

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+224622999999",
    "nom_complet": "Test User",
    "email": "test@example.com",
    "mot_de_passe": "Test123!",
    "type_compte": "PARTICULIER"
  }'
```

**Expected**:
- Response: `"success": true, "message": "OTP envoyé..."`
- Check Mailpit: http://localhost:8025 (you should see OTP email)

---

### Test 3: Search Listings (Meilisearch)

```bash
curl "http://localhost:8000/api/listings/search?quartier=KALOUM&type_bien=APPARTEMENT"
```

**Expected**:
- Response: JSON array with listings
- Query time: < 50ms (check logs)

---

### Test 4: Next.js Frontend

1. Open http://localhost:3000
2. Click "Rechercher" (Search)
3. Apply filters (Kaloum, Appartement)
4. Verify listings display

---

### Test 5: WebSocket Connection

Open browser console on http://localhost:3000:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: 'immoguinee-key',
    wsHost: 'localhost',
    wsPort: 6001,
    forceTLS: false,
    auth: {
        headers: {
            Authorization: `Bearer YOUR_TOKEN`
        }
    }
});

echo.private('conversation.uuid').listen('NewMessageEvent', (e) => {
    console.log('✅ WebSocket connected:', e);
});
```

---

## Step 6: Run Tests

### Laravel Backend Tests (PHPUnit/Pest)

```bash
sail artisan test
```

**Expected output**:
```
   PASS  Tests\Feature\Auth\RegisterTest
  ✓ user can register with valid phone number
  ✓ user cannot register with invalid phone
  ✓ otp is sent after registration

   PASS  Tests\Feature\Listing\CreateListingTest
  ✓ authenticated user can create listing
  ✓ listing requires minimum 3 photos

  Tests:    42 passed (42 run)
  Duration: 5.23s
```

---

### Run Specific Test Suite

```bash
sail artisan test --filter=ListingTest
sail artisan test --testsuite=Feature
```

---

### Frontend Tests (Vitest)

In frontend terminal:

```bash
pnpm test:unit
```

**Expected**:
```
✓ components/ListingCard.test.tsx (5 tests)
✓ hooks/useAuth.test.ts (8 tests)
✓ utils/validators.test.ts (12 tests)

Test Files  15 passed (15)
Tests       85 passed (85)
Duration    2.51s
```

---

### E2E Tests (Playwright)

```bash
pnpm test:e2e
```

This opens a browser and tests critical user flows (US1-US4).

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/add-rating-system
```

---

### 2. Make Backend Changes (Laravel)

Edit files in `backend/app/`, `backend/routes/`, etc.

**Run migrations** (if you added new tables):
```bash
sail artisan make:migration create_ratings_table
sail artisan migrate
```

**Create controller**:
```bash
sail artisan make:controller Api/RatingController
```

**Create model**:
```bash
sail artisan make:model Rating
```

---

### 3. Make Frontend Changes (Next.js)

Edit files in `frontend/app/`, `frontend/components/`, etc.

---

### 4. Run Type Checking

**Laravel (PHPStan)**:
```bash
sail composer phpstan
```

**Next.js (TypeScript)**:
```bash
pnpm typecheck
```

---

### 5. Run Linters

**Laravel (PHP CS Fixer)**:
```bash
sail composer lint
```

**Next.js (ESLint)**:
```bash
pnpm lint
```

---

### 6. Format Code

**Laravel (Pint)**:
```bash
sail pint
```

**Next.js (Prettier)**:
```bash
pnpm format
```

---

### 7. Run Tests

```bash
sail artisan test
pnpm test
```

---

### 8. Commit Changes

```bash
git add .
git commit -m "feat: add rating system for transactions"
```

---

### 9. Push & Create PR

```bash
git push origin feature/add-rating-system
```

Then create Pull Request on GitHub.

---

## Troubleshooting

### Issue: Docker containers won't start

**Solution**:
```bash
sail down -v  # Remove volumes
docker system prune -a  # Clean Docker
sail up -d --force-recreate
```

---

### Issue: Laravel migration errors

**Solution**:
```bash
sail artisan migrate:fresh --seed  # Reset and re-seed
```

---

### Issue: Port 8000 already in use

**Solution**:
```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change Laravel port
APP_PORT=8001 sail up -d
```

---

### Issue: PostgreSQL connection refused

**Solution**:
```bash
# Check PostgreSQL is running
sail ps | grep pgsql

# View logs
sail logs pgsql

# Restart
sail restart pgsql
```

---

### Issue: Meilisearch not indexing

**Solution**:
```bash
# Clear Meilisearch index
sail artisan scout:flush "App\Models\Listing"

# Re-import
sail artisan scout:import "App\Models\Listing"

# Check Meilisearch UI
open http://localhost:7700
```

---

### Issue: Images not uploading to MinIO

**Solution**:
1. Verify MinIO is running: http://localhost:9001
2. Check bucket exists: `immoguinee-dev`
3. Verify `.env` has correct `AWS_S3_ENDPOINT`

---

### Issue: OTP SMS not sending

**Solution**:
1. Check Twilio credentials in `.env`
2. For development, check Mailpit: http://localhost:8025
3. Use mock OTP mode:
   ```bash
   MOCK_OTP=true sail artisan serve
   ```
   (OTP will be logged to console)

---

### Issue: Queue jobs not processing

**Solution**:
```bash
# Check queue worker is running
sail artisan queue:work --verbose

# Clear failed jobs
sail artisan queue:flush

# Restart queue
sail artisan queue:restart
```

---

## Project Structure Reference

```
ImmoG/
├── backend/               # Laravel 11 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   ├── Middleware/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   ├── Jobs/
│   │   ├── Events/
│   │   ├── Notifications/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   ├── api.php
│   │   ├── web.php
│   │   └── channels.php
│   ├── tests/
│   │   ├── Feature/
│   │   └── Unit/
│   ├── .env.example
│   ├── composer.json
│   └── artisan
├── frontend/             # Next.js 14 PWA
│   ├── app/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   └── api/  (optional proxy)
│   ├── components/
│   │   ├── ui/  (shadcn)
│   │   ├── listings/
│   │   └── contracts/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   └── echo.ts
│   ├── .env.example
│   ├── package.json
│   └── next.config.js
├── docker/
│   └── docker-compose.yml
├── n8n/workflows/
└── specs/
```

---

## Useful Commands

### Laravel Backend

```bash
# Development
sail up -d                  # Start Docker containers
sail artisan serve          # Serve API (optional, Sail auto-serves on :8000)
sail down                   # Stop containers

# Database
sail artisan migrate        # Run migrations
sail artisan migrate:fresh --seed  # Reset & seed
sail artisan db:seed        # Seed only
sail artisan tinker         # Interactive shell

# Queue
sail artisan queue:work     # Start queue worker
sail artisan queue:restart  # Restart queue
sail artisan horizon        # Start Horizon (queue dashboard)

# Testing
sail artisan test           # Run all tests
sail artisan test --filter=ListingTest  # Run specific test
sail artisan test --coverage  # With coverage

# Code Quality
sail pint                   # Format code (Laravel Pint)
sail composer phpstan       # Static analysis
sail composer lint          # Run PHP CS Fixer

# Scout (Meilisearch)
sail artisan scout:import "App\Models\Listing"  # Index model
sail artisan scout:flush "App\Models\Listing"   # Clear index

# Caching
sail artisan cache:clear
sail artisan config:clear
sail artisan route:clear
sail artisan view:clear
```

---

### Next.js Frontend

```bash
# Development
pnpm dev                   # Start dev server
pnpm build                 # Build for production
pnpm start                 # Start production server

# Testing
pnpm test                  # Run all tests
pnpm test:unit             # Unit tests only
pnpm test:e2e              # E2E tests (Playwright)

# Code Quality
pnpm lint                  # Run ESLint
pnpm format                # Run Prettier
pnpm typecheck             # TypeScript check
```

---

### Docker

```bash
# General
docker-compose ps          # List services
docker-compose logs -f     # View logs
docker-compose down -v     # Stop & remove volumes

# Specific services
docker-compose up -d n8n
docker-compose logs n8n
docker-compose restart redis
```

---

## Next Steps

Now that your environment is set up, you can:

1. **Explore the codebase**: Start with `backend/app/Http/Controllers/Api/` and `frontend/app/page.tsx`
2. **Read API contracts**: See `specs/001-immog-platform/contracts/`
3. **Implement a user story**: Pick from US1-US9 in spec.md
4. **Run E2E tests**: `pnpm test:e2e` to see automated browser tests
5. **Check monitoring**: Open Grafana at http://localhost:3002
6. **Browse database**: Connect with TablePlus/DBeaver to `localhost:5432`

---

## Additional Resources

- **Specification**: `specs/001-immog-platform/spec.md`
- **Architecture**: `specs/001-immog-platform/research.md`
- **Data Model**: `specs/001-immog-platform/data-model.md`
- **API Contracts**: `specs/001-immog-platform/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

---

## Getting Help

- **GitHub Issues**: https://github.com/your-org/immoguinee/issues
- **Team Chat**: Slack #immog-dev channel
- **Laravel Docs**: https://laravel.com/docs/11.x
- **Next.js Docs**: https://nextjs.org/docs

---

**Setup Complete!** 🎉

You now have a fully functional ImmoGuinée development environment with Laravel 11 backend + Next.js 14 frontend. Happy coding!

**Estimated Total Setup Time**: 40-60 minutes
**Next**: Start implementing User Story 1 (Publish Listing in < 5 minutes)
