export enum DeliveryStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  SERVED = 'SERVED',
}

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  if (Object.values(DeliveryStatus).includes(status as DeliveryStatus)) {
    return status as DeliveryStatus;
  }
  console.warn(`Invalid DeliveryStatus mapping: ${status}, defaulting to PENDING`);
  return DeliveryStatus.PENDING;
};
