import type { CreateOrderDto as ICreateOrderDto, TableId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested, IsInt, Min } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';
import { AddOrderAdjustmentDto } from './add-order-adjustment.dto';

export class CreateOrderDto implements ICreateOrderDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare tableId?: TableId;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  declare items: CreateOrderItemDto[];

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare notes?: string;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddOrderAdjustmentDto)
  declare adjustments?: AddOrderAdjustmentDto[];

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare tipAmount?: number;
}
