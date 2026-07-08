import type {
  BulkUpdateDto as IBulkUpdateDto,
  BulkUpdateItemDto as IBulkUpdateItemDto,
  OrderItemId,
} from '@coaster/common';
import { PaymentMethod } from '@coaster/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ErrorCodes } from '../../core';

export class BulkUpdateItemDto implements IBulkUpdateItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare itemId: OrderItemId;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare paidQuantity?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare servedQuantity?: number;

  @IsOptional()
  @IsIn([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MIXED, PaymentMethod.NONE], {
    message: ErrorCodes.INVALID_TYPE,
  })
  declare paymentMethod?: PaymentMethod;
}

export class BulkUpdateDto implements IBulkUpdateDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  declare items: BulkUpdateItemDto[];
}
