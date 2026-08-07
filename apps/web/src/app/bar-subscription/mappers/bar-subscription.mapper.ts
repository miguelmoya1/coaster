import type { BarSubscription } from '@coaster/common';

export const checkIsBarSubscription = (subscription: unknown): subscription is BarSubscription => {
  return (
    typeof subscription === 'object' &&
    subscription !== null &&
    'barId' in subscription &&
    'plan' in subscription &&
    'status' in subscription
  );
};

export const barSubscriptionMapper = (subscription: unknown): BarSubscription => {
  if (!checkIsBarSubscription(subscription)) {
    throw new Error('Invalid BarSubscription payload');
  }

  return { ...subscription };
};
