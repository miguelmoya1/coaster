import type { AddOrderAdjustmentDto as IAddOrderAdjustmentDto, OrderItemId } from '@coaster/common';
import { AdjustmentTarget, AdjustmentType, ErrorCodes } from '@coaster/common';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddOrderAdjustmentDto implements IAddOrderAdjustmentDto {
  @IsEnum(AdjustmentTarget, { message: ErrorCodes.INVALID_TYPE })
  declare target: AdjustmentTarget;

  @IsEnum(AdjustmentType, { message: ErrorCodes.INVALID_TYPE })
  declare type: AdjustmentType;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.INVALID_TYPE })
  declare value: number;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare reason?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare itemId?: OrderItemId;
}
