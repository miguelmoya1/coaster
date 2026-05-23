import { ErrorCodes } from '@coaster/common';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ServeUnitsDto {
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare quantityToServe: number;
}
