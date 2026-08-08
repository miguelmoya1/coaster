import type { TimeSheetQuery, UserId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsUUID, Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class TimeSheetQueryDto implements TimeSheetQuery {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare userId?: UserId;

  @Matches(ISO_DATE, { message: ErrorCodes.INVALID_DATE })
  @IsOptional()
  declare from?: string;

  @Matches(ISO_DATE, { message: ErrorCodes.INVALID_DATE })
  @IsOptional()
  declare to?: string;
}
