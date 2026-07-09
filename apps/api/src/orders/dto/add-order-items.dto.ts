import type { AddOrderItemsDto as IAddOrderItemsDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class AddOrderItemsDto implements IAddOrderItemsDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  declare items: CreateOrderItemDto[];

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare notes?: string;
}
