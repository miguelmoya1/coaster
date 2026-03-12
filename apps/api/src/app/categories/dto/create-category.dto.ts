import { CreateCategoryDto as ICreateCategoryDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto implements ICreateCategoryDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  name: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  icon?: string;
}
