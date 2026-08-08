/**
 * Newsletter subscription.
 */
import 'server-only';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { newsletterSubscribers } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/resend';
import { isUniqueViolation, parseOrThrow } from '@/lib/errors';
import { newsletterWelcomeHtml } from '@/lib/email/templates';

const subscribeSchema = z.object({
  email: z.email('Please enter a valid email address.').max(200),
});

export async function subscribeToNewsletter(input: { email: string }) {
  const parsed = parseOrThrow(subscribeSchema, input);
  const email = parsed.email.toLowerCase();

  try {
    await db.insert(newsletterSubscribers).values({ email });
  } catch (err) {
    // Unique violation = already subscribed; treat as success.
    if (!isUniqueViolation(err)) throw err;
  }

  await sendEmail({
    to: email,
    subject: 'Welcome to the Savora Gazette',
    html: newsletterWelcomeHtml(email),
  });

  return { subscribed: true };
}
