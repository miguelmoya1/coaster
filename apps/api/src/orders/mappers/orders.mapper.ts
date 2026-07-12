import type { Order, OrderItem, OrderAdjustment } from '@coaster/common';
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
  asOrderAdjustmentId,
  asAdjustmentTarget,
  asAdjustmentType,
} from '../../core';
import { DbOrder as OrderDb, DbOrderItem as OrderItemDb, DbOrderAdjustment as OrderAdjustmentDb } from '../../core/db';

type OrderItemWithProduct = OrderItemDb & {
  product: { name: string };
};

type OrderWithRelations = OrderDb & {
  items: OrderItemWithProduct[];
  table: { name: string } | null;
  adjustments: OrderAdjustmentDb[];
};

export const OrdersMapper = {
  toDomain(dbOrder: OrderWithRelations): Order {
    const adjustments = dbOrder.adjustments ? dbOrder.adjustments.map((a) => OrdersMapper.adjustmentToDomain(a)) : [];
    
    let orderTotal = dbOrder.totalAmount;
    for (const adj of adjustments) {
      if (adj.type === 'FIXED_AMOUNT') {
        orderTotal -= adj.value;
      } else if (adj.type === 'PERCENTAGE') {
        if (adj.target === 'ORDER') {
          orderTotal -= Math.round((dbOrder.totalAmount * adj.value) / 100);
        } else if (adj.target === 'ITEM' && adj.itemId) {
          const item = dbOrder.items.find(i => i.id === adj.itemId);
          if (item) {
            orderTotal -= Math.round(((item.priceAtPurchase * item.quantity) * adj.value) / 100);
          }
        }
      }
    }

    const payableTotal = orderTotal + dbOrder.tipAmount;

    return {
      id: asOrderId(dbOrder.id),
      barId: asBarId(dbOrder.barId),
      tableId: dbOrder.tableId ? asTableId(dbOrder.tableId) : undefined,
      tableName: dbOrder.tableName ?? dbOrder.table?.name,
      status: asOrderStatus(dbOrder.status),
      totalAmount: dbOrder.totalAmount, // Base sum of items
      amountPaidCash: dbOrder.amountPaidCash,
      amountPaidCard: dbOrder.amountPaidCard,
      items: dbOrder.items.map((item) => OrdersMapper.itemToDomain(item)),
      adjustments,
      paymentMethod: asPaymentMethod(dbOrder.paymentMethod),
      notes: dbOrder.notes || undefined,
      tipAmount: dbOrder.tipAmount,
      orderTotal,
      payableTotal,
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
      notes: dbItem.notes || undefined,
      createdAt: Temporal.Instant.fromEpochMilliseconds(dbItem.createdAt.getTime()).toString(),
      updatedAt: Temporal.Instant.fromEpochMilliseconds(dbItem.updatedAt.getTime()).toString(),
    };
  },

  adjustmentToDomain(dbAdjustment: OrderAdjustmentDb): OrderAdjustment {
    return {
      id: asOrderAdjustmentId(dbAdjustment.id),
      orderId: asOrderId(dbAdjustment.orderId),
      target: asAdjustmentTarget(dbAdjustment.target),
      itemId: dbAdjustment.itemId ? asOrderItemId(dbAdjustment.itemId) : undefined,
      type: asAdjustmentType(dbAdjustment.type),
      value: dbAdjustment.value,
      reason: dbAdjustment.reason || undefined,
      createdAt: Temporal.Instant.fromEpochMilliseconds(dbAdjustment.createdAt.getTime()).toString(),
    };
  },

  toDto(domainEntity: Order): Order {
    return domainEntity;
  },
};
