import { AppError, ErrorCodes } from '@/lib/errors';
import { daysFromTodayLocal, localDateTimeToUtc } from '@/lib/time';
import { restaurantConfig } from '@/config/restaurant';

/** Validate and convert a restaurant-local scheduled pickup/delivery time. */
export function validateScheduledOrderTime(value: string, now: Date = new Date()): Date {
  const scheduledFor = localDateTimeToUtc(value);
  const [date, time] = value.split('T');
  const daysAhead = daysFromTodayLocal(date, now);

  if (scheduledFor.getTime() <= now.getTime()) {
    throw schedulingError('The scheduled time must be in the future.');
  }

  if (daysAhead > restaurantConfig.ordering.maxScheduledDays) {
    throw schedulingError(
      `Orders can be scheduled up to ${restaurantConfig.ordering.maxScheduledDays} days in advance.`,
    );
  }

  const insideServicePeriod = restaurantConfig.servicePeriods.some(
    (period) => time >= period.start && time < period.end,
  );
  if (!insideServicePeriod) {
    throw schedulingError(
      'Scheduled pickup and delivery are available only during restaurant service hours.',
    );
  }

  return scheduledFor;
}

function schedulingError(message: string): AppError {
  return new AppError(ErrorCodes.VALIDATION_FAILED, message);
}
