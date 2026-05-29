import * as Coaster from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class BulkUpdateItemDto implements Coaster.BulkUpdateItemDto {
  @IsUUID('4', { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: Coaster.ErrorCodes.REQUIRED })
  declare itemId: Coaster.OrderItemId;

  @IsOptional()
  @IsInt({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @Min(0, { message: Coaster.ErrorCodes.INVALID_TYPE })
  declare paidQuantity?: number;

  @IsOptional()
  @IsInt({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @Min(0, { message: Coaster.ErrorCodes.INVALID_TYPE })
  declare servedQuantity?: number;
}

export class BulkUpdateDto implements Coaster.BulkUpdateDto {
  @IsArray({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: Coaster.ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  declare items: BulkUpdateItemDto[];
}
