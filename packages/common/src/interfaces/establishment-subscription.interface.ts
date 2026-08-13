import { SubscriptionPlan } from '../constants/subscription-plan.type';
import { SubscriptionStatus } from '../constants/subscription-status.type';
import { EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';

export type EstablishmentSubscriptionId = Brand<string, 'EstablishmentSubscriptionId'>;

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

export interface AdminEstablishmentSubscription extends Omit<EstablishmentSubscription, 'manualGrant'> {
  manualGrant: AdminManualGrant | null;
}

export interface EstablishmentSubscription {
  id: EstablishmentSubscriptionId;
  establishmentId: EstablishmentId;
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
