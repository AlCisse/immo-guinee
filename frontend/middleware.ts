import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for ImmoGuinée
 *
 * Note: Route protection is handled client-side via AuthContext
 * because we store tokens in localStorage (not accessible server-side).
 * This middleware focuses on security headers.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Add security headers to all responses
  const response = NextResponse.next();

  // Security headers.
  // Note: X-XSS-Protection is intentionally NOT set — the legacy header is
  // deprecated and can itself open vulnerabilities on old browsers; the CSP
  // below is the modern XSS defense.
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content-Security-Policy
  // Permissive enough to not break Next.js (which injects inline scripts/styles
  // without a nonce setup) while still restricting exotic sources.
  // Tighten script-src to nonce-based later for a stricter policy.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
    ].join('; ')
  );

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
