import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto implements Coaster.CreateOrderDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare tableId?: Coaster.TableId;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  declare items: CreateOrderItemDto[];
}
