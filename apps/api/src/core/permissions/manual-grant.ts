import { DbSubscriptionPlan } from '../db';

export interface ManualGrantState {
  manualPlan: DbSubscriptionPlan | null;
  manualGrantExpiresAt: Date | null;
}

export const isManualGrantActive = (subscription: ManualGrantState | null | undefined, now = new Date()): boolean => {
  const plan = subscription?.manualPlan;

  if (!plan || plan === DbSubscriptionPlan.FREE) {
    return false;
  }

  return !subscription?.manualGrantExpiresAt || now <= subscription.manualGrantExpiresAt;
};
