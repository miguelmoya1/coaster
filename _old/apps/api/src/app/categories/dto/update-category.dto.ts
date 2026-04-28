import { UpdateCategoryDto as IUpdateCategoryDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/logic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto implements IUpdateCategoryDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare icon?: string;
}
