export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export const asPaymentStatus = (status: string): PaymentStatus => {
  if (Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    return status as PaymentStatus;
  }
  console.warn(`Invalid PaymentStatus mapping: ${status}, defaulting to PENDING`);
  return PaymentStatus.PENDING;
};
