export enum BarRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export enum ShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
  SPLIT = 'SPLIT',
}

export enum ShiftExchangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const asBarRole = (role: string): BarRole => {
  if (Object.values(BarRole).includes(role as BarRole)) {
    return role as BarRole;
  }
  console.warn(`Invalid BarRole mapping: ${role}, defaulting to STAFF`);
  return BarRole.STAFF;
};

export const asShiftType = (type: string): ShiftType => {
  if (Object.values(ShiftType).includes(type as ShiftType)) {
    return type as ShiftType;
  }
  console.warn(`Invalid ShiftType mapping: ${type}, defaulting to MORNING`);
  return ShiftType.MORNING;
};

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  if (Object.values(ShiftExchangeStatus).includes(status as ShiftExchangeStatus)) {
    return status as ShiftExchangeStatus;
  }
  console.warn(`Invalid ShiftExchangeStatus mapping: ${status}, defaulting to PENDING`);
  return ShiftExchangeStatus.PENDING;
};
