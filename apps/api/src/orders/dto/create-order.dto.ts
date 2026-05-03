import { ErrorCodes, CreateOrderDto as ICreateOrderDto } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto implements ICreateOrderDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare tableId?: string;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  declare items: CreateOrderItemDto[];
}
