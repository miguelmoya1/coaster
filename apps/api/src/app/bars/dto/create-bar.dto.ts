import { CreateBarDto as ICreateBarDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBarDto implements ICreateBarDto {
  @IsString({ message: ErrorCodes.MUST_BE_A_STRING })
  @IsNotEmpty({ message: ErrorCodes.MUST_NOT_BE_EMPTY })
  @MinLength(3, { message: ErrorCodes.MUST_HAVE_MIN_LENGTH })
  @MaxLength(50, { message: ErrorCodes.MUST_HAVE_MAX_LENGTH })
  name: string;
}
