import type { VoidTimeEntryDto as IVoidTimeEntryDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VoidTimeEntryDto implements IVoidTimeEntryDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MinLength(5, { message: ErrorCodes.TIME_ENTRY_REASON_REQUIRED })
  @MaxLength(500, { message: ErrorCodes.MAX_LENGTH })
  declare reason: string;
}
