export enum BarRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
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

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  if (Object.values(ShiftExchangeStatus).includes(status as ShiftExchangeStatus)) {
    return status as ShiftExchangeStatus;
  }
  console.warn(`Invalid ShiftExchangeStatus mapping: ${status}, defaulting to PENDING`);
  return ShiftExchangeStatus.PENDING;
};

export const asRole = (role: string): Role => {
  if (Object.values(Role).includes(role as Role)) {
    return role as Role;
  }
  console.warn(`Invalid Role mapping: ${role}, defaulting to USER`);
  return Role.USER;
};
