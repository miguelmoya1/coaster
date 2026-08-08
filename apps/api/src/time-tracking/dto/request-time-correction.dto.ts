import type { RequestTimeCorrectionDto as IRequestTimeCorrectionDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestTimeCorrectionDto implements IRequestTimeCorrectionDto {
  @IsISO8601({ strict: true }, { message: ErrorCodes.INVALID_DATE })
  declare occurredAt: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MinLength(5, { message: ErrorCodes.TIME_ENTRY_REASON_REQUIRED })
  @MaxLength(500, { message: ErrorCodes.MAX_LENGTH })
  declare reason: string;
}
