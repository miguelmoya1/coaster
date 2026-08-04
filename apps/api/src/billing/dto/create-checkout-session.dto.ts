import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { IsIn, IsOptional } from 'class-validator';

const BILLING_PLANS = [SubscriptionPlan.PRO] as const;

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsIn(BILLING_PLANS, { message: ErrorCodes.INVALID_SUBSCRIPTION_PLAN })
  plan: (typeof BILLING_PLANS)[number] = SubscriptionPlan.PRO;
}
