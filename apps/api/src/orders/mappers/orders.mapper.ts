import type { Order, OrderItem } from '@coaster/common';
import {
  asBarId,
  asDeliveryStatus,
  asOrderId,
  asOrderItemId,
  asOrderStatus,
  asPaymentMethod,
  asPaymentStatus,
  asProductId,
  asTableId,
} from '../../core';
import { DbOrder as OrderDb, DbOrderItem as OrderItemDb } from '../../db';

type OrderItemWithProduct = OrderItemDb & {
  product: { name: string };
};

type OrderWithRelations = OrderDb & {
  items: OrderItemWithProduct[];
  table: { name: string } | null;
};

export const OrdersMapper = {
  toDomain(dbOrder: OrderWithRelations): Order {
    return {
      id: asOrderId(dbOrder.id),
      barId: asBarId(dbOrder.barId),
      tableId: dbOrder.tableId ? asTableId(dbOrder.tableId) : undefined,
      tableName: dbOrder.tableName ?? dbOrder.table?.name,
      status: asOrderStatus(dbOrder.status),
      totalAmount: dbOrder.totalAmount,
      amountPaidCash: dbOrder.amountPaidCash,
      amountPaidCard: dbOrder.amountPaidCard,
      items: dbOrder.items.map((item) => OrdersMapper.itemToDomain(item)),
      paymentMethod: asPaymentMethod(dbOrder.paymentMethod),
      createdAt: Temporal.Instant.fromEpochMilliseconds(dbOrder.createdAt.getTime()).toString(),
      updatedAt: Temporal.Instant.fromEpochMilliseconds(dbOrder.updatedAt.getTime()).toString(),
    };
  },

  itemToDomain(dbItem: OrderItemWithProduct): OrderItem {
    return {
      id: asOrderItemId(dbItem.id),
      orderId: asOrderId(dbItem.orderId),
      productId: asProductId(dbItem.productId),
      productName: dbItem.product.name,
      quantity: dbItem.quantity,
      priceAtPurchase: dbItem.priceAtPurchase,
      paidQuantity: dbItem.paidQuantity,
      paidQuantityCash: dbItem.paidQuantityCash,
      paidQuantityCard: dbItem.paidQuantityCard,
      servedQuantity: dbItem.servedQuantity,
      paymentStatus: asPaymentStatus(dbItem.paymentStatus),
      deliveryStatus: asDeliveryStatus(dbItem.deliveryStatus),
      paymentMethod: asPaymentMethod(dbItem.paymentMethod),
      createdAt: Temporal.Instant.fromEpochMilliseconds(dbItem.createdAt.getTime()).toString(),
      updatedAt: Temporal.Instant.fromEpochMilliseconds(dbItem.updatedAt.getTime()).toString(),
    };
  },

  toDto(domainEntity: Order): Order {
    return domainEntity;
  },
};
