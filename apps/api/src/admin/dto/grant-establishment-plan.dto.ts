import type { GrantEstablishmentPlanDto as IGrantEstablishmentPlanDto } from '@coaster/common';
import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const GRANTABLE_PLANS = [SubscriptionPlan.PRO] as const;

export class GrantEstablishmentPlanDto implements IGrantEstablishmentPlanDto {
  @IsIn(GRANTABLE_PLANS, { message: ErrorCodes.INVALID_SUBSCRIPTION_PLAN })
  declare plan: (typeof GRANTABLE_PLANS)[number];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  @Max(3650, { message: ErrorCodes.MAX_LENGTH })
  durationDays?: number | null;

  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(280, { message: ErrorCodes.MAX_LENGTH })
  reason?: string;
}
