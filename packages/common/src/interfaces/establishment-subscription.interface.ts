import { SubscriptionPlan } from '../constants/subscription-plan.type';
import { SubscriptionStatus } from '../constants/subscription-status.type';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';

export type BarSubscriptionId = Brand<string, 'BarSubscriptionId'>;

export interface ManualGrant {
  plan: SubscriptionPlan;
  expiresAt: string | null;
}

export interface AdminManualGrant extends ManualGrant {
  reason: string | null;
  grantedById: string | null;
  grantedByName: string | null;
  grantedAt: string;
}

export interface AdminBarSubscription extends Omit<BarSubscription, 'manualGrant'> {
  manualGrant: AdminManualGrant | null;
}

export interface BarSubscription {
  id: BarSubscriptionId;
  barId: BarId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  manualGrant: ManualGrant | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutSessionDto {
  plan: Exclude<SubscriptionPlan, 'FREE'>;
}

export interface CreateCheckoutSessionResponse {
  id: string;
  url: string;
}

export interface CreateCustomerPortalSessionDto {}

export interface CreateCustomerPortalSessionResponse {
  url: string;
}
