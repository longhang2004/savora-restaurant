/**
 * Transactional email via Resend.
 *
 * Email failures must never corrupt the primary database transaction —
 * every send is best-effort and returns a result instead of throwing.
 */
import 'server-only';
import { Resend } from 'resend';
import { serverEnv } from '@/config/env';

let resendClient: Resend | null | undefined;

function client(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  if (!serverEnv.RESEND_API_KEY) {
    resendClient = null;
    return null;
  }
  resendClient = new Resend(serverEnv.RESEND_API_KEY);
  return resendClient;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const r = client();
  if (!r) {
    console.log(
      `[email] skipped (no RESEND_API_KEY): to=${message.to} subject=${message.subject}`,
    );
    return { ok: false, error: 'not configured' };
  }
  const from = serverEnv.RESEND_FROM_EMAIL ?? 'Savora Restaurant <onboarding@resend.dev>';
  try {
    await r.emails.send({ from, to: message.to, subject: message.subject, html: message.html });
    return { ok: true };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { ok: false, error: 'send failed' };
  }
}
