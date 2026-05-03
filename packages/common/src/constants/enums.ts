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

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
}

export enum OrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SERVED = 'SERVED',
}

export const asTableStatus = (status: string): TableStatus => {
  if (Object.values(TableStatus).includes(status as TableStatus)) {
    return status as TableStatus;
  }
  console.warn(`Invalid TableStatus mapping: ${status}, defaulting to FREE`);
  return TableStatus.FREE;
};

export const asOrderStatus = (status: string): OrderStatus => {
  if (Object.values(OrderStatus).includes(status as OrderStatus)) {
    return status as OrderStatus;
  }
  console.warn(`Invalid OrderStatus mapping: ${status}, defaulting to OPEN`);
  return OrderStatus.OPEN;
};

export const asPaymentStatus = (status: string): PaymentStatus => {
  if (Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    return status as PaymentStatus;
  }
  console.warn(`Invalid PaymentStatus mapping: ${status}, defaulting to PENDING`);
  return PaymentStatus.PENDING;
};

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  if (Object.values(DeliveryStatus).includes(status as DeliveryStatus)) {
    return status as DeliveryStatus;
  }
  console.warn(`Invalid DeliveryStatus mapping: ${status}, defaulting to PENDING`);
  return DeliveryStatus.PENDING;
};
