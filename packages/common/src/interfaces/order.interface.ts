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
  productId: ProductId;
  quantity: number;
}

export interface CreateOrderDto {
  tableId?: TableId;
  items: CreateOrderItemDto[];
}

export interface AddOrderItemsDto {
  items: CreateOrderItemDto[];
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
}

export interface BulkUpdateDto {
  items: BulkUpdateItemDto[];
}
