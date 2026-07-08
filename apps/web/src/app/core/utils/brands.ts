import type {
  BarId,
  BarMemberId,
  CategoryId,
  OrderId,
  OrderItemId,
  ProductId,
  ShiftExchangeId,
  ShiftExchangeStatus,
  ShiftId,
  TableId,
  UserId,
} from '@coaster/common';
import { BarRole, DeliveryStatus, OrderStatus, PaymentMethod, PaymentStatus, Role, TableStatus } from '@coaster/common';

// Basic validators
export const asUserId = (id: string): UserId => id as UserId;
export const asBarId = (id: string): BarId => id as BarId;
export const asBarMemberId = (id: string): BarMemberId => id as BarMemberId;
export const asTableId = (id: string): TableId => id as TableId;
export const asCategoryId = (id: string): CategoryId => id as CategoryId;
export const asProductId = (id: string): ProductId => id as ProductId;
export const asOrderId = (id: string): OrderId => id as OrderId;
export const asOrderItemId = (id: string): OrderItemId => id as OrderItemId;
export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId => id as ShiftExchangeId;

// Mapper validators
export const asBarRole = (role: string): BarRole => {
  const roles: BarRole[] = [BarRole.OWNER, BarRole.STAFF];
  if (roles.includes(role as BarRole)) return role as BarRole;
  return 'STAFF';
};

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  const statuses: DeliveryStatus[] = ['PENDING', 'PARTIAL', DeliveryStatus.SERVED];
  if (statuses.includes(status as DeliveryStatus)) return status as DeliveryStatus;
  return 'PENDING';
};

export const asOrderStatus = (status: string): OrderStatus => {
  const statuses: OrderStatus[] = [OrderStatus.OPEN, OrderStatus.CLOSED, OrderStatus.CANCELLED];
  if (statuses.includes(status as OrderStatus)) return status as OrderStatus;
  return 'OPEN';
};

export const asPaymentStatus = (status: string): PaymentStatus => {
  const statuses: PaymentStatus[] = ['PENDING', 'PARTIAL', PaymentStatus.PAID];
  if (statuses.includes(status as PaymentStatus)) return status as PaymentStatus;
  return 'PENDING';
};

export const asPaymentMethod = (method: string): PaymentMethod => {
  const methods: PaymentMethod[] = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MIXED, PaymentMethod.NONE];
  if (methods.includes(method as PaymentMethod)) return method as PaymentMethod;
  return 'NONE';
};

export const asRole = (role: string): Role => {
  const roles: Role[] = ['USER', Role.ADMIN];
  if (roles.includes(role as Role)) return role as Role;
  return 'USER';
};

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  const statuses: ShiftExchangeStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
  if (statuses.includes(status as ShiftExchangeStatus)) return status as ShiftExchangeStatus;
  return 'PENDING';
};

export const asTableStatus = (status: string): TableStatus => {
  const statuses: TableStatus[] = [TableStatus.FREE, TableStatus.OCCUPIED];
  if (statuses.includes(status as TableStatus)) return status as TableStatus;
  return 'FREE';
};
