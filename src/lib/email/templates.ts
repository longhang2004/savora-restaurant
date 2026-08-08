/**
 * Transactional email templates (inline-styled HTML, no framework).
 */
import { formatCents } from '@/lib/money';
import { restaurantConfig } from '@/config/restaurant';
import { escapeHtml } from './html';

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0807;font-family:Georgia,serif;color:#f7f5f2;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#14110f;border:1px solid rgba(200,155,60,.25);border-radius:16px;padding:32px;">
    <p style="margin:0 0 4px;font-size:22px;letter-spacing:4px;color:#c89b3c;">SAVORA<span style="color:#f7f5f2;">.</span></p>
    <p style="margin:0 0 24px;font-size:12px;color:#a39e99;letter-spacing:1px;">PREMIUM VIETNAMESE FUSION · ${restaurantConfig.address.district}, ${restaurantConfig.address.city}</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#f7f5f2;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin-top:28px;font-size:12px;color:#6e6963;line-height:1.6;">Savora Restaurant · ${restaurantConfig.address.street}, ${restaurantConfig.address.district}, ${restaurantConfig.address.city}, Vietnam<br/>${restaurantConfig.phoneDisplay} · ${restaurantConfig.emails.general}</p>
  </div></body></html>`;
}

export function reservationConfirmationHtml(input: {
  code: string;
  name: string;
  dateLabel: string;
  time: string;
  partySize: number;
  tableName: string;
}): string {
  return shell(
    'Reservation Confirmed',
    `<p style="font-size:15px;line-height:1.7;color:#a39e99;">Dear ${escapeHtml(input.name)},</p>
     <p style="font-size:15px;line-height:1.7;color:#a39e99;">Thank you for choosing Savora. Your table is confirmed:</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
       <tr><td style="padding:8px 0;color:#6e6963;">Confirmation code</td><td style="padding:8px 0;color:#c89b3c;font-weight:bold;letter-spacing:2px;">${escapeHtml(input.code)}</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Date</td><td style="padding:8px 0;color:#f7f5f2;">${escapeHtml(input.dateLabel)}</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Time</td><td style="padding:8px 0;color:#f7f5f2;">${escapeHtml(input.time)}</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Party size</td><td style="padding:8px 0;color:#f7f5f2;">${input.partySize} ${input.partySize === 1 ? 'guest' : 'guests'}</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Table</td><td style="padding:8px 0;color:#f7f5f2;">${escapeHtml(input.tableName)}</td></tr>
     </table>
     <p style="font-size:13px;color:#6e6963;line-height:1.6;">Please arrive 10 minutes before your reservation. Tables are held for 15 minutes past the scheduled time. For changes, contact ${restaurantConfig.emails.reservations}.</p>`,
  );
}

export function orderConfirmationHtml(input: {
  code: string;
  name: string;
  fulfillment: string;
  scheduledLabel: string;
  itemsHtml: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}): string {
  return shell(
    'Order Confirmed — Thank You',
    `<p style="font-size:15px;line-height:1.7;color:#a39e99;">Dear ${escapeHtml(input.name)},</p>
     <p style="font-size:15px;line-height:1.7;color:#a39e99;">Your payment was received and the kitchen has your order (${escapeHtml(input.fulfillment)}, ${escapeHtml(input.scheduledLabel)}). Order code: <strong style="color:#c89b3c;">${escapeHtml(input.code)}</strong></p>
     ${input.itemsHtml}
     <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
       <tr><td style="padding:6px 0;color:#6e6963;">Subtotal</td><td style="padding:6px 0;color:#f7f5f2;text-align:right;">${formatCents(input.subtotalCents, input.currency)}</td></tr>
       ${input.deliveryFeeCents > 0 ? `<tr><td style="padding:6px 0;color:#6e6963;">Delivery fee</td><td style="padding:6px 0;color:#f7f5f2;text-align:right;">${formatCents(input.deliveryFeeCents, input.currency)}</td></tr>` : ''}
       <tr><td style="padding:6px 0;color:#6e6963;">Tax</td><td style="padding:6px 0;color:#f7f5f2;text-align:right;">${formatCents(input.taxCents, input.currency)}</td></tr>
       <tr><td style="padding:10px 0 0;color:#c89b3c;font-weight:bold;">Total paid</td><td style="padding:10px 0 0;color:#c89b3c;font-weight:bold;text-align:right;">${formatCents(input.totalCents, input.currency)}</td></tr>
     </table>`,
  );
}

export function contactInquiryNotificationHtml(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  return shell(
    `New Contact Inquiry: ${input.subject}`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px;">
       <tr><td style="padding:8px 0;color:#6e6963;">From</td><td style="padding:8px 0;color:#f7f5f2;">${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Subject</td><td style="padding:8px 0;color:#f7f5f2;">${escapeHtml(input.subject)}</td></tr>
       <tr><td style="padding:8px 0;color:#6e6963;">Message</td><td style="padding:8px 0;color:#a39e99;line-height:1.6;">${escapeHtml(input.message)}</td></tr>
     </table>`,
  );
}

export function newsletterWelcomeHtml(email: string): string {
  return shell(
    'Welcome to the Savora Gazette',
    `<p style="font-size:15px;line-height:1.7;color:#a39e99;">You are subscribed with <strong style="color:#f7f5f2;">${escapeHtml(email)}</strong>. Expect private wine dinners, seasonal menu previews and culinary stories.</p>`,
  );
}
