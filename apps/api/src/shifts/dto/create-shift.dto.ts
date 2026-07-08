import type { CreateShiftDto as ICreateShiftDto, UserId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShiftDto implements Omit<ICreateShiftDto, 'startTime' | 'endTime'> {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare userId: UserId;

  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @Transform(({ value }: { value: string }) => {
    try {
      return Temporal.Instant.from(value);
    } catch {
      return value;
    }
  })
  declare startTime: Temporal.Instant;

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
