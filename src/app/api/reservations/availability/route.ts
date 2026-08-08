/**
 * GET /api/reservations/availability?date=YYYY-MM-DD&partySize=N
 *
 * Public availability read path used by the reservation form.
 * Returns per-slot classification: available | limited | full.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAvailability } from '@/features/reservations/availability';
import { isAppError } from '@/lib/errors';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.coerce.number().int().min(1),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get('date'),
    partySize: request.nextUrl.searchParams.get('partySize'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Invalid availability query.' } },
      { status: 400 },
    );
  }

  try {
    const data = await getAvailability(parsed.data.date, parsed.data.partySize);
    return NextResponse.json(data);
  } catch (err) {
    if (isAppError(err)) {
      return NextResponse.json({ error: err.toShape() }, { status: err.status });
    }
    console.error('[availability] unexpected error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Could not load availability.' } },
      { status: 500 },
    );
  }
}
