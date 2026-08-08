import { z } from 'zod';

/**
 * Product-level error model.
 *
 * Server actions and route handlers return errors as plain, serializable
 * objects with a stable `code` so the UI can react (e.g. offer a next
 * action) and log enough detail server-side without leaking internals to
 * customers.
 */

export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESERVATION_SLOT_UNAVAILABLE: 'RESERVATION_SLOT_UNAVAILABLE',
  RESERVATION_INVALID_PARTY_SIZE: 'RESERVATION_INVALID_PARTY_SIZE',
  RESERVATION_INVALID_DATE: 'RESERVATION_INVALID_DATE',
  INVALID_RESERVATION_TRANSITION: 'INVALID_RESERVATION_TRANSITION',
  MENU_ITEM_UNAVAILABLE: 'MENU_ITEM_UNAVAILABLE',
  MENU_ITEM_NOT_FOUND: 'MENU_ITEM_NOT_FOUND',
  INVALID_MODIFIER_SELECTION: 'INVALID_MODIFIER_SELECTION',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_ORDER_TRANSITION: 'INVALID_ORDER_TRANSITION',
  PAYMENT_NOT_CONFIRMED: 'PAYMENT_NOT_CONFIRMED',
  CHECKOUT_DUPLICATE: 'CHECKOUT_DUPLICATE',
  DELIVERY_OUTSIDE_AREA: 'DELIVERY_OUTSIDE_AREA',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface AppErrorShape {
  code: ErrorCode;
  /** Safe to show to customers. */
  message: string;
  /** Optional field-level details (form validation). */
  fieldErrors?: Record<string, string[]>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { status?: number; fieldErrors?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options?.status ?? 400;
    this.fieldErrors = options?.fieldErrors;
  }

  toShape(): AppErrorShape {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Wrap a thrown value into a serializable server-action result. */
export function toErrorResult(err: unknown): { ok: false; error: AppErrorShape } {
  if (isAppError(err)) {
    return { ok: false, error: err.toShape() };
  }
  console.error('[savora] unhandled error:', err);
  return {
    ok: false,
    error: {
      code: ErrorCodes.INTERNAL,
      message: 'Something went wrong. Please try again.',
    },
  };
}

export function toSuccessResult<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/**
 * PostgreSQL unique-violation detection. drizzle/postgres-js wraps the
 * driver error (code 23505) in a DrizzleQueryError, so check both levels.
 */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/**
 * Parse with a Zod schema, converting validation failures into a
 * customer-friendly AppError with field-level details.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      const list = fieldErrors[key] ?? [];
      list.push(issue.message);
      fieldErrors[key] = list;
    }
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Please check your input.', {
      fieldErrors,
    });
  }
  return result.data;
}
