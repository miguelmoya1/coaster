import type { AdminBarsQuery } from '@coaster/common';
import { BarBillingSource, ErrorCodes, SubscriptionStatus } from '@coaster/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const BILLING_SOURCES = [BarBillingSource.NONE, BarBillingSource.STRIPE, BarBillingSource.MANUAL] as const;
const STATUSES = Object.values(SubscriptionStatus);

export class AdminBarsQueryDto implements AdminBarsQuery {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(120, { message: ErrorCodes.MAX_LENGTH })
  q?: string;

  @IsOptional()
  @IsIn(BILLING_SOURCES, { message: ErrorCodes.INVALID_TYPE })
  billingSource?: BarBillingSource;

  @IsOptional()
  @IsIn(STATUSES, { message: ErrorCodes.INVALID_TYPE })
  status?: SubscriptionStatus;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  page?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  @Max(100, { message: ErrorCodes.MAX_LENGTH })
  pageSize?: number;
}
