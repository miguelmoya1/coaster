import { CreateShiftDto as ICreateShiftDto, ShiftType, UserId } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShiftDto implements ICreateShiftDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare userId: UserId;

  @IsDateString({}, { message: ErrorCodes.INVALID_DATE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare date: string; // ISO 8601 string

  @IsEnum(ShiftType, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare type: ShiftType;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare notes?: string;
}
