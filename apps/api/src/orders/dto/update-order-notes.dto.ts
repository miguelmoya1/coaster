import type { UpdateOrderNotesDto as IUpdateOrderNotesDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderNotesDto implements IUpdateOrderNotesDto {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(500, { message: ErrorCodes.INVALID_TYPE })
  declare notes?: string;

  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(500, { message: ErrorCodes.INVALID_TYPE })
  declare ticketNotes?: string;
}
