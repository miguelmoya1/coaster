import type { RevokeBarPlanDto as IRevokeBarPlanDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeBarPlanDto implements IRevokeBarPlanDto {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(280, { message: ErrorCodes.MAX_LENGTH })
  reason?: string;
}
