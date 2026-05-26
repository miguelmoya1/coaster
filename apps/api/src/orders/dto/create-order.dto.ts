import * as Coaster from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto implements Coaster.CreateOrderDto {
  @IsUUID('4', { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare tableId?: Coaster.TableId;

  @IsArray({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: Coaster.ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  declare items: CreateOrderItemDto[];
}
