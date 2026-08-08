/**
 * Server-side admin authorization.
 *
 * Every admin page and every admin mutation must go through requireAdmin().
 * The middleware redirect is a UX convenience only — this module is the
 * security boundary.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError, ErrorCodes } from '@/lib/errors';
import { SESSION_COOKIE, verifySessionToken, type AdminSession } from './session';

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Throws UNAUTHORIZED when no valid admin session exists. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Please sign in to continue.', { status: 401 });
  }
  return session;
}

/** For page components: redirect to the login screen instead of throwing. */
export async function requireAdminOrRedirect(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}
