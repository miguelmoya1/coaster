import {
  CategoryId,
  CreateProductDto as ICreateProductDto,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateProductDto implements ICreateProductDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare categoryId: CategoryId;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare currentStock?: number;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare minStockAlert?: number;
}
