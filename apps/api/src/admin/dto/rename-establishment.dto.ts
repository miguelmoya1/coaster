import type { RenameEstablishmentDto as IRenameEstablishmentDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RenameEstablishmentDto implements IRenameEstablishmentDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @MinLength(3, { message: ErrorCodes.MIN_LENGTH })
  @MaxLength(50, { message: ErrorCodes.MAX_LENGTH })
  declare name: string;
}
