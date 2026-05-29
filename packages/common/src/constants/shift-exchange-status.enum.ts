export enum ShiftExchangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  if (Object.values(ShiftExchangeStatus).includes(status as ShiftExchangeStatus)) {
    return status as ShiftExchangeStatus;
  }
  console.warn(`Invalid ShiftExchangeStatus mapping: ${status}, defaulting to PENDING`);
  return ShiftExchangeStatus.PENDING;
};
