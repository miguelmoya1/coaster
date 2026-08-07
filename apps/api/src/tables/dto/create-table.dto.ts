import type { CreateTableDto as ICreateTableDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTableDto implements ICreateTableDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;
}
