/**
 * Admin authentication.
 *
 * Production path: Supabase Auth (email/password) with an admin_profiles
 * row keyed by the Supabase user id.
 *
 * Local/demo path (DEMO_MODE=true, DEMO_ADMIN_PASSWORD set): a clearly
 * gated password login — never enabled in production.
 */
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { serverEnv, isDemoMode } from '@/config/env';
import { db } from '@/lib/db/client';
import { adminProfiles } from '@/lib/db/schema';
import { AppError, ErrorCodes } from '@/lib/errors';
import type { AdminSession } from './session';

export function supabaseConfigured(): boolean {
  return Boolean(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL &&
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let supabaseClient: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new AppError(ErrorCodes.NOT_CONFIGURED, 'Supabase Auth is not configured.', {
      status: 503,
    });
  }
  if (!supabaseClient) {
    supabaseClient = createClient(
      serverEnv.NEXT_PUBLIC_SUPABASE_URL!,
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return supabaseClient;
}

export async function loginWithSupabase(
  email: string,
  password: string,
): Promise<AdminSession> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password.', { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(adminProfiles)
    .where(eq(adminProfiles.userId, data.user.id));

  if (!profile) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'This account has no staff access.', {
      status: 403,
    });
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? email,
    displayName: profile.displayName,
    role: profile.role,
    mode: 'supabase',
  };
}

export function demoLoginConfigured(): boolean {
  return isDemoMode && Boolean(serverEnv.DEMO_ADMIN_EMAIL && serverEnv.DEMO_ADMIN_PASSWORD);
}

export async function loginWithDemo(
  email: string,
  password: string,
): Promise<AdminSession> {
  if (!demoLoginConfigured()) {
    throw new AppError(
      ErrorCodes.NOT_CONFIGURED,
      'Demo admin login is not enabled. Set DEMO_MODE=true and DEMO_ADMIN_PASSWORD.',
      { status: 503 },
    );
  }

  const expectedEmail = serverEnv.DEMO_ADMIN_EMAIL!;
  const expectedPassword = serverEnv.DEMO_ADMIN_PASSWORD!;

  const emailMatch =
    email.toLowerCase() === expectedEmail.toLowerCase();
  const passwordMatch = safeEqual(password, expectedPassword);

  if (!emailMatch || !passwordMatch) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password.', { status: 401 });
  }

  return {
    userId: 'demo-admin',
    email: expectedEmail,
    displayName: serverEnv.DEMO_ADMIN_DISPLAY_NAME ?? 'Restaurant Manager',
    role: 'ADMIN',
    mode: 'demo',
  };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
