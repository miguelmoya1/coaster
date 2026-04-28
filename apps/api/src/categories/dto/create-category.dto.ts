import {
  ErrorCodes,
  CreateCategoryDto as ICreateCategoryDto,
} from '@coaster/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto implements ICreateCategoryDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare icon?: string;
}
