import type { CreateTimeEntryDto as ICreateTimeEntryDto, UserId } from '@coaster/common';
import { ErrorCodes, TimeEntryType } from '@coaster/common';
import { IsEnum, IsISO8601, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTimeEntryDto implements ICreateTimeEntryDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare userId: UserId;

  @IsEnum(TimeEntryType, { message: ErrorCodes.INVALID_TYPE })
  declare type: TimeEntryType;

  @IsISO8601({ strict: true }, { message: ErrorCodes.INVALID_DATE })
  declare occurredAt: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MinLength(5, { message: ErrorCodes.TIME_ENTRY_REASON_REQUIRED })
  @MaxLength(500, { message: ErrorCodes.MAX_LENGTH })
  declare reason: string;
}
