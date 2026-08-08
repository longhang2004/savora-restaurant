/**
 * Middleware: convenience guard for /admin/*.
 *
 * This redirect is UX, not security — every admin page and mutation
 * re-verifies the session server-side via requireAdmin().
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
