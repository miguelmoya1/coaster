export const SubscriptionPlan = {
  FREE: 'FREE',
  PRO_MONTHLY: 'PRO_MONTHLY',
  PRO_YEARLY: 'PRO_YEARLY',
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];
