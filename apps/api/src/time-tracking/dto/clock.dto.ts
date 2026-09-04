import type { ClockDto as IClockDto } from '@coaster/common';
import { ErrorCodes, TimeEntryType } from '@coaster/common';
import { IsEnum, IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class ClockDto implements IClockDto {
  @IsEnum(TimeEntryType, { message: ErrorCodes.INVALID_TYPE })
  declare type: TimeEntryType;

  @IsLatitude({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare latitude?: number;

  @IsLongitude({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare longitude?: number;
}
