import { Order, OrderItem } from '@coaster/common';

const checkIsOrderItem = (item: unknown): item is OrderItem => {
  const i = item as Record<string, unknown>;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof i['id'] === 'string' &&
    typeof i['orderId'] === 'string' &&
    typeof i['productId'] === 'string' &&
    typeof i['quantity'] === 'number' &&
    typeof i['priceAtPurchase'] === 'number' &&
    typeof i['paidQuantity'] === 'number' &&
    typeof i['servedQuantity'] === 'number' &&
    typeof i['paymentStatus'] === 'string' &&
    typeof i['deliveryStatus'] === 'string'
  );
};

export const checkIsOrder = (order: unknown): order is Order => {
  const o = order as Record<string, unknown>;
  return (
    typeof order === 'object' &&
    order !== null &&
    typeof o['id'] === 'string' &&
    typeof o['barId'] === 'string' &&
    typeof o['status'] === 'string' &&
    typeof o['totalAmount'] === 'number' &&
    Array.isArray(o['items']) &&
    (o['items'] as unknown[]).every(checkIsOrderItem)
  );
};

export const orderMapper = (order: unknown): Order => {
  if (!checkIsOrder(order)) {
    throw new Error('Invalid Order payload');
  }
  return order;
};

export const orderArrayMapper = (orders: unknown): Order[] => {
  if (!Array.isArray(orders)) throw new Error('Expected array of Orders');
  return orders.map(orderMapper);
};
