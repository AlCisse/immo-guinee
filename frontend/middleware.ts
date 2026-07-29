import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for ImmoGuinée
 *
 * Route protection is handled client-side via AuthContext. This middleware
 * emits the security headers, including a per-request nonce-based CSP.
 */

/** Generate a fresh, unpredictable base64 nonce (Edge-runtime Web Crypto). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Build the Content-Security-Policy.
 *
 * Production: `script-src` is locked to a per-request nonce + `strict-dynamic`
 * — no `'unsafe-inline'`, no `'unsafe-eval'`. Next.js stamps the same nonce on
 * every script tag it emits (it reads it from the request CSP header), and
 * `strict-dynamic` lets those trusted scripts pull their own chunks, so an
 * injected `<script>` without the nonce cannot execute. `object-src 'none'` +
 * `base-uri 'self'` close the classic bypasses.
 *
 * `style-src` keeps `'unsafe-inline'` deliberately: Next's image placeholder,
 * Tailwind arbitrary values and toast libraries all emit inline `style`
 * attributes (which nonces can't cover), and style injection is a far lower
 * risk than script injection — locking scripts is where the XSS win is.
 *
 * Development keeps `'unsafe-eval'`/`'unsafe-inline'` because Fast Refresh/HMR
 * relies on eval'd modules and un-nonced inline bootstrap.
 */
function buildCsp(nonce: string, isProd: boolean): string {
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss: ws:",
    "media-src 'self' data: blob: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProd = process.env.NODE_ENV === 'production';

  // Per-request nonce. Next.js reads it from the request's CSP header and
  // applies it to the scripts it renders, so it must be set on BOTH the
  // forwarded request headers and the final response.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isProd);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Security headers.
  // Note: X-XSS-Protection is intentionally NOT set — the legacy header is
  // deprecated and can itself open vulnerabilities on old browsers; the CSP
  // below is the modern XSS defense.
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', csp);

  // HSTS only in production (sent over HTTPS; ignored on HTTP anyway, but
  // avoids polluting localhost dev sessions with preload headers).
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // CORS for API proxy requests. Only reflect the explicitly configured app
  // origin — never fall back to '*' (a missing env must NOT open the API to
  // every origin). If unset, no CORS header is emitted (same-origin still works).
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (pathname.startsWith('/api') && appOrigin) {
    response.headers.set('Access-Control-Allow-Origin', appOrigin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|images|icons|.*\\..*|api/health).*)',
  ],
};
