import type { UserId } from '@coaster/common';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ErrorCodes } from '../../core';

import type { CreateShiftDto as ICreateShiftDto } from '@coaster/common';

export class CreateShiftDto implements Omit<ICreateShiftDto, 'startTime' | 'endTime'> {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare userId: UserId;

  @IsDateString({}, { message: ErrorCodes.INVALID_DATE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @Transform(({ value }: { value: string }) => {
    try {
      return Temporal.Instant.from(value);
    } catch {
      return value;
    }
  })
  declare startTime: Temporal.Instant;

  @IsDateString({}, { message: ErrorCodes.INVALID_DATE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @Transform(({ value }: { value: string }) => {
    try {
      return Temporal.Instant.from(value);
    } catch {
      return value;
    }
  })
  declare endTime: Temporal.Instant;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare notes?: string;
}
