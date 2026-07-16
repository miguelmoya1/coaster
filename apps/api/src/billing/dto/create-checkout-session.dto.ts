import { SubscriptionPlan } from '@coaster/common';
import { IsIn, IsUrl } from 'class-validator';

const BILLING_PLANS = [SubscriptionPlan.PRO_MONTHLY, SubscriptionPlan.PRO_YEARLY] as const;

export class CreateCheckoutSessionDto {
  @IsIn(BILLING_PLANS)
  plan!: (typeof BILLING_PLANS)[number];

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;
}
