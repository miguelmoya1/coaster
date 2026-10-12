export const ShiftExchangeStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ShiftExchangeStatus = (typeof ShiftExchangeStatus)[keyof typeof ShiftExchangeStatus];

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  const statuses: ShiftExchangeStatus[] = Object.values(ShiftExchangeStatus);
  if (statuses.includes(status as ShiftExchangeStatus)) return status as ShiftExchangeStatus;
  return ShiftExchangeStatus.PENDING;
};
