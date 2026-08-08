/**
 * Contact form — persist first, notify second.
 *
 * The inquiry is inserted into the database before any email is sent so
 * an email-provider failure never loses a customer message.
 */
import 'server-only';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { contactInquiries } from '@/lib/db/schema';
import { restaurantConfig } from '@/config/restaurant';
import { parseOrThrow } from '@/lib/errors';
import { sendEmail } from '@/lib/email/resend';
import { contactInquiryNotificationHtml } from '@/lib/email/templates';

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z.email('Please enter a valid email address.').max(200),
  subject: z.string().trim().min(2, 'Please enter a subject.').max(200),
  message: z.string().trim().min(10, 'Please tell us a little more.').max(3000),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export async function submitContactInquiry(input: ContactInquiryInput): Promise<{ id: string }> {
  const parsed = parseOrThrow(contactInquirySchema, input);

  const [inquiry] = await db
    .insert(contactInquiries)
    .values({
      name: parsed.name,
      email: parsed.email,
      subject: parsed.subject,
      message: parsed.message,
    })
    .returning({ id: contactInquiries.id });

  // Best-effort restaurant notification after persistence.
  await sendEmail({
    to: restaurantConfig.emails.general,
    subject: `New inquiry: ${parsed.subject}`,
    html: contactInquiryNotificationHtml(parsed),
  });

  return { id: inquiry.id };
}
