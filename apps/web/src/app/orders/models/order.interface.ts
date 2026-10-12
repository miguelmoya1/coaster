import type { EstablishmentId, Brand } from '@coaster/core';
import type { ProductId } from '@coaster/products';
import type { TableId } from '@coaster/tables';
import { AdjustmentTarget } from './adjustment-target.type';
import { AdjustmentType } from './adjustment-type.type';
import { DeliveryStatus } from './delivery-status.type';
import { OrderStatus } from './order-status.type';
import { PaymentMethod } from './payment-method.type';
import { PaymentStatus } from './payment-status.type';

export type OrderId = Brand<string, 'OrderId'>;
export type OrderItemId = Brand<string, 'OrderItemId'>;
export type OrderAdjustmentId = Brand<string, 'OrderAdjustmentId'>;

export interface OrderItem {
  id: OrderItemId;
  orderId: OrderId;
  productId: ProductId;
  productName?: string;
  quantity: number;
  priceAtPurchase: number;
  paidQuantity: number;
  paidQuantityCash: number;
  paidQuantityCard: number;
  servedQuantity: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderAdjustment {
  id: OrderAdjustmentId;
  orderId: OrderId;
  target: AdjustmentTarget;
  itemId?: OrderItemId;
  type: AdjustmentType;
  value: number;
  reason?: string;
  createdAt?: string;
}

export interface Order {
  id: OrderId;
  establishmentId: EstablishmentId;
  tableId?: TableId;
  tableName?: string;
  status: OrderStatus;
  totalAmount: number;
  amountPaidCash: number;
  amountPaidCard: number;
  items: OrderItem[];
  adjustments: OrderAdjustment[];
  paymentMethod: PaymentMethod;
  notes?: string;
  ticketNotes?: string;
  tipAmount: number;
  netTotal: number;
  taxBreakdown: OrderTaxLine[];
  taxAmountTotal: number;
  orderTotal: number;
  payableTotal: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderTaxLine {
  taxRate: number;
  taxBase: number;
  taxAmount: number;
}

export interface CreateOrderItemDto {
  productId: ProductId;
  quantity: number;
  notes?: string;
}

export interface CreateOrderDto {
  tableId?: TableId;
  items: CreateOrderItemDto[];
  adjustments?: AddOrderAdjustmentDto[];
  tipAmount?: number;
  notes?: string;
}

export interface AddOrderItemsDto {
  items: CreateOrderItemDto[];
  notes?: string;
}

export interface UpdateOrderNotesDto {
  notes?: string;
  ticketNotes?: string;
}

export interface UpdateOrderItemNotesDto {
  notes?: string;
}

export interface MoveTableDto {
  tableId: TableId;
}

export interface MergeOrdersDto {
  orderIds: OrderId[];
  targetTableId?: TableId;
}

export interface BulkUpdateItemDto {
  itemId: OrderItemId;
  paidQuantity?: number;
  servedQuantity?: number;
  paymentMethod?: PaymentMethod;
}

export interface BulkUpdateDto {
  items: BulkUpdateItemDto[];
}

export interface CheckoutOrderDto {
  paymentMethod: PaymentMethod;
}

export interface AddOrderAdjustmentDto {
  target: AdjustmentTarget;
  itemId?: OrderItemId;
  type: AdjustmentType;
  value: number;
  reason?: string;
}

export interface RemoveOrderAdjustmentDto {
  adjustmentId: OrderAdjustmentId;
}

export interface UpdateOrderTipDto {
  tipAmount: number;
}

export const asOrderId = (id: string): OrderId => id as OrderId;
export const asOrderItemId = (id: string): OrderItemId => id as OrderItemId;
export const asOrderAdjustmentId = (id: string): OrderAdjustmentId => id as OrderAdjustmentId;
