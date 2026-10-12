export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  MIXED: 'MIXED',
  NONE: 'NONE',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const asPaymentMethod = (method: string): PaymentMethod => {
  const methods: PaymentMethod[] = Object.values(PaymentMethod);
  if (methods.includes(method as PaymentMethod)) return method as PaymentMethod;
  return PaymentMethod.NONE;
};
