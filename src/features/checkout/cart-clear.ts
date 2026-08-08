export function shouldClearCartAfterPaidConfirmation(
  paymentStatus: string,
  accessVerified: boolean,
): boolean {
  return accessVerified && paymentStatus === 'PAID';
}
