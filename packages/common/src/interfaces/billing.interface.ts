import { SubscriptionPlan } from '../constants/subscription-plan.type';
import { SubscriptionStatus } from '../constants/subscription-status.type';
import { BarId } from './bar.interface';

export interface BarSubscription {
  barId: BarId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
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
