# ImmoGuinée Frontend - Next.js 16 PWA

Progressive Web App for the ImmoGuinée real estate platform in Guinea.

## Tech Stack

- **Next.js 16** with App Router
- **React 18**
- **TypeScript 5+** (strict mode)
- **TailwindCSS 3** - Utility-first CSS
- **React Query (TanStack Query v5)** - Server state management
- **React Leaflet** - Interactive maps
- **Laravel Echo** - Real-time broadcasting
- **Framer Motion** - Animations
- **PWA** - Progressive Web App support

## Prerequisites

- Node.js 20+ LTS
- npm 10+

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your API URL and configuration

## Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

Create an optimized production build:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Type Checking

Run TypeScript type checking:
```bash
npm run type-check
```

## Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
app/
├── (auth)/              # Authenticated routes
├── (public)/            # Public routes
├── api/                 # API routes (if needed)
├── layout.tsx           # Root layout
├── page.tsx             # Home page
├── providers.tsx        # React Query provider
└── globals.css          # Global styles

components/
├── ui/                  # Reusable UI components
├── listings/            # Listing-related components
├── auth/                # Authentication components
├── maps/                # Map components (Leaflet)
└── layout/              # Layout components

lib/
├── api/                 # API client & hooks
├── auth/                # Authentication context
├── socket/              # Laravel Echo setup
├── maps/                # Leaflet configuration
└── utils/               # Utility functions

types/
└── index.ts             # TypeScript type definitions

hooks/
└── use-*.ts             # Custom React hooks

public/
├── icons/               # PWA icons
├── screenshots/         # PWA screenshots
├── manifest.json        # PWA manifest
└── ...                  # Static assets
```

## Features

### PWA Support
- Offline support with service worker
- Add to home screen
- Push notifications (future)
- Background sync (future)

### Real-time Updates
- Laravel Echo integration
- Socket.IO client
- Real-time messaging
- Live notifications

### Interactive Maps
- React Leaflet integration
- Geolocation search
- Custom markers for listings
- Cluster markers for multiple listings

### Performance
- Next.js 16 optimizations
- Image optimization (WebP, AVIF)
- Code splitting
- React Query caching
- Static generation where possible

### Responsive Design
- Mobile-first approach
- TailwindCSS breakpoints
- Touch-friendly UI
- Optimized for all devices

## Environment Variables

See `.env.example` for all available configuration options.

Required variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_ECHO_HOST` - Laravel Echo server host
- `NEXT_PUBLIC_ECHO_PORT` - Laravel Echo server port

Optional variables:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `NEXT_PUBLIC_LOGROCKET_APP_ID` - Logrocket session replay

## Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t immog-frontend .
docker run -p 3000:3000 immog-frontend
```

### Static Export (if applicable)
```bash
npm run build
# Output in /out directory
```

## License

Proprietary - ImmoGuinée Platform
