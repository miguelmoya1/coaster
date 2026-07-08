import type {
  BarId,
  BarMemberId,
  CategoryId,
  OrderId,
  OrderItemId,
  ProductId,
  ShiftExchangeId,
  ShiftId,
  TableId,
  UserId,
} from '@coaster/common';
import {
  BarRole,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  ShiftExchangeStatus,
  TableStatus,
} from '@coaster/common';

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
  const roles: BarRole[] = Object.values(BarRole);
  if (roles.includes(role as BarRole)) return role as BarRole;
  return BarRole.STAFF;
};

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  const statuses: DeliveryStatus[] = Object.values(DeliveryStatus);
  if (statuses.includes(status as DeliveryStatus)) return status as DeliveryStatus;
  return DeliveryStatus.PENDING;
};

export const asOrderStatus = (status: string): OrderStatus => {
  const statuses: OrderStatus[] = Object.values(OrderStatus);
  if (statuses.includes(status as OrderStatus)) return status as OrderStatus;
  return OrderStatus.OPEN;
};

export const asPaymentStatus = (status: string): PaymentStatus => {
  const statuses: PaymentStatus[] = Object.values(PaymentStatus);
  if (statuses.includes(status as PaymentStatus)) return status as PaymentStatus;
  return PaymentStatus.PENDING;
};

export const asPaymentMethod = (method: string): PaymentMethod => {
  const methods: PaymentMethod[] = Object.values(PaymentMethod);
  if (methods.includes(method as PaymentMethod)) return method as PaymentMethod;
  return PaymentMethod.NONE;
};

export const asRole = (role: string): Role => {
  const roles: Role[] = Object.values(Role);
  if (roles.includes(role as Role)) return role as Role;
  return Role.USER;
};

export const asShiftExchangeStatus = (status: string): ShiftExchangeStatus => {
  const statuses: ShiftExchangeStatus[] = Object.values(ShiftExchangeStatus);
  if (statuses.includes(status as ShiftExchangeStatus)) return status as ShiftExchangeStatus;
  return ShiftExchangeStatus.PENDING;
};

export const asTableStatus = (status: string): TableStatus => {
  const statuses: TableStatus[] = Object.values(TableStatus);
  if (statuses.includes(status as TableStatus)) return status as TableStatus;
  return TableStatus.FREE;
};
