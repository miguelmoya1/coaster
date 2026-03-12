import { CreateBarDto as ICreateBarDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBarDto implements ICreateBarDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @MinLength(3, { message: ErrorCodes.MIN_LENGTH })
  @MaxLength(50, { message: ErrorCodes.MAX_LENGTH })
  name: string;
}
