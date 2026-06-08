import type {
  BarId,
  BarMemberId,
  BarRole,
  CategoryId,
  DeliveryStatus,
  OrderId,
  OrderItemId,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductId,
  Role,
  ShiftExchangeId,
  ShiftExchangeStatus,
  ShiftId,
  TableId,
  TableStatus,
  UserId,
} from '@coaster/common';

// Casting functions
export const asBarId = (id: string): BarId => id as BarId;
export const asBarMemberId = (id: string): BarMemberId => id as BarMemberId;
export const asCategoryId = (id: string): CategoryId => id as CategoryId;
export const asOrderId = (id: string): OrderId => id as OrderId;
export const asOrderItemId = (id: string): OrderItemId => id as OrderItemId;
export const asProductId = (id: string): ProductId => id as ProductId;
export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId => id as ShiftExchangeId;
export const asTableId = (id: string): TableId => id as TableId;
export const asUserId = (id: string): UserId => id as UserId;

// Mapper validators
export const asBarRole = (role: string): BarRole => {
  const roles: BarRole[] = ['OWNER', 'STAFF'];
  if (roles.includes(role as BarRole)) return role as BarRole;
  return 'STAFF';
};

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  const statuses: DeliveryStatus[] = ['PENDING', 'PARTIAL', 'SERVED'];
  if (statuses.includes(status as DeliveryStatus)) return status as DeliveryStatus;
  return 'PENDING';
};

export const asOrderStatus = (status: string): OrderStatus => {
  const statuses: OrderStatus[] = ['OPEN', 'CLOSED', 'CANCELLED'];
  if (statuses.includes(status as OrderStatus)) return status as OrderStatus;
  return 'OPEN';
};

export const asPaymentStatus = (status: string): PaymentStatus => {
  const statuses: PaymentStatus[] = ['PENDING', 'PARTIAL', 'PAID'];
  if (statuses.includes(status as PaymentStatus)) return status as PaymentStatus;
  return 'PENDING';
};

export const asPaymentMethod = (method: string): PaymentMethod => {
  const methods: PaymentMethod[] = ['CASH', 'CARD', 'MIXED', 'NONE'];
  if (methods.includes(method as PaymentMethod)) return method as PaymentMethod;
  return 'NONE';
};

export const asRole = (role: string): Role => {
  const roles: Role[] = ['USER', 'ADMIN'];
  if (roles.includes(role as Role)) return role as Role;
  return 'USER';
};

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  const statuses: ShiftExchangeStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
  if (statuses.includes(status as ShiftExchangeStatus)) return status as ShiftExchangeStatus;
  return 'PENDING';
};

export const asTableStatus = (status: string): TableStatus => {
  const statuses: TableStatus[] = ['FREE', 'OCCUPIED'];
  if (statuses.includes(status as TableStatus)) return status as TableStatus;
  return 'FREE';
};
