export const ShiftExchangeStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ShiftExchangeStatus = (typeof ShiftExchangeStatus)[keyof typeof ShiftExchangeStatus];
