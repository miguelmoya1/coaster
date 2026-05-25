import { DeliveryStatus, OrderStatus, PaymentStatus } from '../constants/enums';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { ProductId } from './product.interface';
import { TableId } from './table.interface';

export type OrderId = Brand<string, 'OrderId'>;
export type OrderItemId = Brand<string, 'OrderItemId'>;

export const asOrderId = (id: string): OrderId => id as OrderId;
export const asOrderItemId = (id: string): OrderItemId => id as OrderItemId;

export interface OrderItem {
  id: OrderItemId;
  orderId: OrderId;
  productId: ProductId;
  productName?: string;
  quantity: number;
  priceAtPurchase: number;
  paidQuantity: number;
  servedQuantity: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: OrderId;
  barId: BarId;
  tableId?: TableId;
  tableName?: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  tableId?: string;
  items: CreateOrderItemDto[];
}

export interface AddOrderItemsDto {
  items: CreateOrderItemDto[];
}

export interface MoveTableDto {
  tableId: string;
}

export interface MergeOrdersDto {
  orderIds: string[];
  targetTableId?: string;
}

export interface BulkPayItemDto {
  itemId: string;
  paidQuantity: number;
}

export interface BulkPayDto {
  items: BulkPayItemDto[];
}

export interface BulkServeItemDto {
  itemId: string;
  servedQuantity: number;
}

export interface BulkServeDto {
  items: BulkServeItemDto[];
}

