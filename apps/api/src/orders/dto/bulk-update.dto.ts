import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class BulkUpdateItemDto implements Coaster.BulkUpdateItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare itemId: Coaster.OrderItemId;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare paidQuantity?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare servedQuantity?: number;
}

export class BulkUpdateDto implements Coaster.BulkUpdateDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  declare items: BulkUpdateItemDto[];
}
