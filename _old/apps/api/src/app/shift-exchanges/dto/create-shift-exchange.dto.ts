import { CreateShiftExchangeDto as ICreateShiftExchangeDto, UserId } from '@coaster/common';
import { ErrorCodes } from '@coaster/logic';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateShiftExchangeDto implements ICreateShiftExchangeDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare targetId?: UserId;
}
