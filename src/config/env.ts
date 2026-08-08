/**
 * Server-only environment validation.
 *
 * Imported exclusively by server modules (database client, auth, Stripe,
 * email). Throws a descriptive error at startup when required variables
 * are missing so misconfiguration is caught early.
 */
import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (Supabase Postgres URL)'),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  DEMO_MODE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  DEMO_ADMIN_EMAIL: z.string().optional(),
  DEMO_ADMIN_PASSWORD: z.string().optional(),
  DEMO_ADMIN_DISPLAY_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid server environment:\n${details}`);
}

export const serverEnv = parsed.data;

/**
 * Demo behavior is disabled for production deployments.
 *
 * The local Playwright harness intentionally uses `next start` so it exercises
 * the production build. It opts into a separate, loopback-only test context;
 * a production process connected to a managed database cannot enable demo mode
 * through that flag.
 */
export function demoModeEnabled(
  configured: boolean,
  nodeEnv = process.env.NODE_ENV,
  localE2e = process.env.SAVORA_LOCAL_E2E === 'true',
  databaseUrl = process.env.DATABASE_URL,
): boolean {
  const loopbackDatabase = isLoopbackDatabase(databaseUrl);
  return configured && (nodeEnv !== 'production' || (localE2e && loopbackDatabase));
}

export const isDemoMode = demoModeEnabled(serverEnv.DEMO_MODE);

function isLoopbackDatabase(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
