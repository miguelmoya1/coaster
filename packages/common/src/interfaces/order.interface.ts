import { DeliveryStatus } from '../constants/delivery-status.type';
import { OrderStatus } from '../constants/order-status.type';
import { PaymentStatus } from '../constants/payment-status.type';
import { PaymentMethod } from '../constants/payment-method.type';
import { AdjustmentTarget } from '../constants/adjustment-target.type';
import { AdjustmentType } from '../constants/adjustment-type.type';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { ProductId } from './product.interface';
import { TableId } from './table.interface';

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
  barId: BarId;
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
  tipAmount: number;
  orderTotal: number;
  payableTotal: number;
  createdAt?: string;
  updatedAt?: string;
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
