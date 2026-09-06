import type { UpdateOrderItemNotesDto as IUpdateOrderItemNotesDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderItemNotesDto implements IUpdateOrderItemNotesDto {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(500, { message: ErrorCodes.INVALID_TYPE })
  declare notes?: string;
}
