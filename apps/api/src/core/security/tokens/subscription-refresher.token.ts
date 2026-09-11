import type { SubscriptionState } from '../data-access/security.repository';

export interface SubscriptionRefresher {
  refresh(establishmentId: string): Promise<SubscriptionState | null>;
}

export const SUBSCRIPTION_REFRESHER = 'SUBSCRIPTION_REFRESHER';
