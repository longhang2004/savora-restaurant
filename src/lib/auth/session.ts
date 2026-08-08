/**
 * Admin session cookies (signed JWT).
 *
 * Deliberately dependency-light (jose only) so it works in both the
 * Next.js middleware (edge) and server components/actions.
 */
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'savora_session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12h

export type SessionMode = 'supabase' | 'demo';

export interface AdminSession {
  userId: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF';
  mode: SessionMode;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a value of at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    mode: session.mode,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: (payload.displayName as string) ?? payload.email,
      role: (payload.role as AdminSession['role']) ?? 'STAFF',
      mode: (payload.mode as SessionMode) ?? 'demo',
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
