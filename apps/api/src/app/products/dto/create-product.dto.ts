import {
  CategoryId,
  CreateProductDto as ICreateProductDto,
  ProductStatus,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProductDto implements ICreateProductDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare categoryId: CategoryId;

  @IsEnum(ProductStatus, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare status?: ProductStatus;
}
