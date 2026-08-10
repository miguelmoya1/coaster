import { AdjustmentTarget } from '../constants/adjustment-target.type';
import { AdjustmentType } from '../constants/adjustment-type.type';
import { EstablishmentRole } from '../constants/establishment-role.type';
import { DeliveryStatus } from '../constants/delivery-status.type';
import { OrderStatus } from '../constants/order-status.type';
import { PaymentMethod } from '../constants/payment-method.type';
import { PaymentStatus } from '../constants/payment-status.type';
import { Role } from '../constants/role.type';
import { ShiftExchangeStatus } from '../constants/shift-exchange-status.type';
import { TableStatus } from '../constants/table-status.type';
import type { EstablishmentMemberId } from '../interfaces/establishment-member.interface';
import type { EstablishmentId } from '../interfaces/establishment.interface';
import type { CategoryId } from '../interfaces/category.interface';
import type { OrderAdjustmentId, OrderId, OrderItemId } from '../interfaces/order.interface';
import type { ProductId } from '../interfaces/product.interface';
import type { ShiftExchangeId, ShiftId } from '../interfaces/shift.interface';
import type { TableId } from '../interfaces/table.interface';
import type { TimeEntryId } from '../interfaces/time-entry.interface';
import type { UserId } from '../interfaces/user.interface';

export const asEstablishmentId = (id: string): EstablishmentId => id as EstablishmentId;
export const asEstablishmentMemberId = (id: string): EstablishmentMemberId => id as EstablishmentMemberId;
export const asCategoryId = (id: string): CategoryId => id as CategoryId;
export const asOrderId = (id: string): OrderId => id as OrderId;
export const asOrderItemId = (id: string): OrderItemId => id as OrderItemId;
export const asOrderAdjustmentId = (id: string): OrderAdjustmentId => id as OrderAdjustmentId;
export const asProductId = (id: string): ProductId => id as ProductId;
export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId => id as ShiftExchangeId;
export const asTableId = (id: string): TableId => id as TableId;
export const asTimeEntryId = (id: string): TimeEntryId => id as TimeEntryId;
export const asUserId = (id: string): UserId => id as UserId;

export const asEstablishmentRole = (role: string): EstablishmentRole => {
  const roles: EstablishmentRole[] = Object.values(EstablishmentRole);
  if (roles.includes(role as EstablishmentRole)) return role as EstablishmentRole;
  return EstablishmentRole.STAFF;
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

export const asAdjustmentType = (type: string): AdjustmentType => {
  const types: AdjustmentType[] = Object.values(AdjustmentType);
  if (types.includes(type as AdjustmentType)) return type as AdjustmentType;
  return AdjustmentType.FIXED_AMOUNT;
};

export const asAdjustmentTarget = (target: string): AdjustmentTarget => {
  const targets: AdjustmentTarget[] = Object.values(AdjustmentTarget);
  if (targets.includes(target as AdjustmentTarget)) return target as AdjustmentTarget;
  return AdjustmentTarget.ORDER;
};
