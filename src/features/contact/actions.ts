/**
 * Contact + newsletter server actions.
 */
'use server';

import { toErrorResult, toSuccessResult } from '@/lib/errors';
import { submitContactInquiry, type ContactInquiryInput } from './service';
import { subscribeToNewsletter } from '@/features/newsletter/service';

export async function submitContactAction(input: ContactInquiryInput) {
  try {
    const data = await submitContactInquiry(input);
    return toSuccessResult(data);
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function subscribeNewsletterAction(input: { email: string }) {
  try {
    const data = await subscribeToNewsletter(input);
    return toSuccessResult(data);
  } catch (err) {
    return toErrorResult(err);
  }
}
