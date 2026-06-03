import type { Order, OrderItem } from '@coaster/common';
import { asBarId, asDeliveryStatus, asOrderId, asOrderItemId, asOrderStatus, asPaymentStatus, asProductId, asTableId } from '../../core';
import { Order as OrderDb, OrderItem as OrderItemDb } from '../../core';

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
      items: dbOrder.items.map((item) => OrdersMapper.itemToDomain(item)),
      createdAt: dbOrder.createdAt.toISOString(),
      updatedAt: dbOrder.updatedAt.toISOString(),
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
      servedQuantity: dbItem.servedQuantity,
      paymentStatus: asPaymentStatus(dbItem.paymentStatus),
      deliveryStatus: asDeliveryStatus(dbItem.deliveryStatus),
      createdAt: dbItem.createdAt.toISOString(),
      updatedAt: dbItem.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Order): Order {
    return domainEntity;
  },
};
