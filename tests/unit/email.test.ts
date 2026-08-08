import { describe, expect, it } from 'vitest';
import {
  contactInquiryNotificationHtml,
  newsletterWelcomeHtml,
  reservationConfirmationHtml,
} from '@/lib/email/templates';
import { escapeHtml } from '@/lib/email/html';

describe('transactional email HTML safety', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml('<script>alert("x")</script> &')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp;',
    );
  });

  it('does not render contact input as markup', () => {
    const html = contactInquiryNotificationHtml({
      name: '<img src=x onerror=alert(1)>',
      email: 'guest@example.com',
      subject: '<b>Private dining</b>',
      message: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes guest and reservation text in confirmations', () => {
    const html = reservationConfirmationHtml({
      code: 'SV-123',
      name: '<b>Guest</b>',
      dateLabel: 'Monday & Night',
      time: '18:30',
      partySize: 2,
      tableName: '<window>',
    });

    expect(html).toContain('&lt;b&gt;Guest&lt;/b&gt;');
    expect(html).toContain('Monday &amp; Night');
    expect(html).toContain('&lt;window&gt;');
  });

  it('escapes newsletter addresses', () => {
    expect(newsletterWelcomeHtml('a<b>@example.com')).toContain('a&lt;b&gt;@example.com');
  });
});
