export const SubscriptionPlan = {
  FREE: 'FREE',
  PRO: 'PRO',
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];
