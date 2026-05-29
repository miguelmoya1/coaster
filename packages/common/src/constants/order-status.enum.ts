export enum OrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export const asOrderStatus = (status: string): OrderStatus => {
  if (Object.values(OrderStatus).includes(status as OrderStatus)) {
    return status as OrderStatus;
  }
  console.warn(`Invalid OrderStatus mapping: ${status}, defaulting to OPEN`);
  return OrderStatus.OPEN;
};
