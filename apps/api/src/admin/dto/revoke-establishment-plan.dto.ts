import type { RevokeEstablishmentPlanDto as IRevokeEstablishmentPlanDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeEstablishmentPlanDto implements IRevokeEstablishmentPlanDto {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(280, { message: ErrorCodes.MAX_LENGTH })
  reason?: string;
}
