import type { CreateShiftExchangeDto as ICreateShiftExchangeDto, UserId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateShiftExchangeDto implements ICreateShiftExchangeDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare targetId?: UserId;
}
