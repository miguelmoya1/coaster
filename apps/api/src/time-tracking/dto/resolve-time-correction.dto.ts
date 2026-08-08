import type { ResolveTimeCorrectionDto as IResolveTimeCorrectionDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveTimeCorrectionDto implements IResolveTimeCorrectionDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(500, { message: ErrorCodes.MAX_LENGTH })
  @IsOptional()
  declare reason?: string;
}
