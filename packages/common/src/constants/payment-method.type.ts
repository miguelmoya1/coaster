export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  MIXED: 'MIXED',
  NONE: 'NONE',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
