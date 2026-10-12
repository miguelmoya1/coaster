import type { Order } from '../models/order.interface';
import { OrderStatus } from '../models/order-status.type';

export interface OrderHistorySummary {
  closed: number;
  cancelled: number;
  revenue: number;
  averageTicket: number;
}

export const orderHistorySummary = (orders: Order[]): OrderHistorySummary => {
  const closed = orders.filter((order) => order.status === OrderStatus.CLOSED);
  const revenue = closed.reduce((sum, order) => sum + order.orderTotal, 0);

  return {
    closed: closed.length,
    cancelled: orders.filter((order) => order.status === OrderStatus.CANCELLED).length,
    revenue,
    averageTicket: closed.length === 0 ? 0 : Math.round(revenue / closed.length),
  };
};
