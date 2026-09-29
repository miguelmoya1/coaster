export const DeliveryStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  SERVED: 'SERVED',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];
