export const PaymentStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const asPaymentStatus = (status: string): PaymentStatus => {
  const statuses: PaymentStatus[] = Object.values(PaymentStatus);
  if (statuses.includes(status as PaymentStatus)) return status as PaymentStatus;
  return PaymentStatus.PENDING;
};
