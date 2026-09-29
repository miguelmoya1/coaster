export const DeliveryStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  SERVED: 'SERVED',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const asDeliveryStatus = (status: string): DeliveryStatus => {
  const statuses: DeliveryStatus[] = Object.values(DeliveryStatus);
  if (statuses.includes(status as DeliveryStatus)) return status as DeliveryStatus;
  return DeliveryStatus.PENDING;
};
