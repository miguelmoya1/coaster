import { CreateShiftDto as ICreateShiftDto, UserId } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShiftDto implements ICreateShiftDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare userId: UserId;

  @IsDateString({}, { message: ErrorCodes.INVALID_DATE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare startTime: string;

  @IsDateString({}, { message: ErrorCodes.INVALID_DATE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare endTime: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare notes?: string;
}
