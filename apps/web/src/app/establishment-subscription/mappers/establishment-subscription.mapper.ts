import type { EstablishmentSubscription } from '@coaster/common';

export const checkIsEstablishmentSubscription = (subscription: unknown): subscription is EstablishmentSubscription => {
  return (
    typeof subscription === 'object' &&
    subscription !== null &&
    'establishmentId' in subscription &&
    'plan' in subscription &&
    'status' in subscription
  );
};

export const establishmentSubscriptionMapper = (subscription: unknown): EstablishmentSubscription => {
  if (!checkIsEstablishmentSubscription(subscription)) {
    throw new Error('Invalid EstablishmentSubscription payload');
  }

  return { ...subscription };
};
