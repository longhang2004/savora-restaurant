/**
 * Admin authentication actions.
 */
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { parseOrThrow, toErrorResult, toSuccessResult } from '@/lib/errors';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/auth/session';
import { loginWithDemo, loginWithSupabase, supabaseConfigured } from '@/lib/auth/providers';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.').max(200),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export async function loginAction(input: { email: string; password: string }) {
  try {
    const parsed = parseOrThrow(loginSchema, input);

    const session = supabaseConfigured()
      ? await loginWithSupabase(parsed.email, parsed.password)
      : await loginWithDemo(parsed.email, parsed.password);

    const token = await createSessionToken(session);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

    return toSuccessResult({ email: session.email, displayName: session.displayName });
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/admin/login');
}

export async function getLoginProvidersAction() {
  try {
    const { demoLoginConfigured } = await import('@/lib/auth/providers');
    return toSuccessResult({
      supabase: supabaseConfigured(),
      demo: demoLoginConfigured(),
    });
  } catch (err) {
    return toErrorResult(err);
  }
}
