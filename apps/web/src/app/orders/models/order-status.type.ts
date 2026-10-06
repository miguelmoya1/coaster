export const OrderStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const asOrderStatus = (status: string): OrderStatus => {
  const statuses: OrderStatus[] = Object.values(OrderStatus);
  if (statuses.includes(status as OrderStatus)) return status as OrderStatus;
  return OrderStatus.OPEN;
};
