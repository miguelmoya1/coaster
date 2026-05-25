import { ErrorCodes, BulkUpdateDto as IBulkUpdateDto, BulkUpdateItemDto as IBulkUpdateItemDto } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class BulkUpdateItemDto implements IBulkUpdateItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare itemId: string;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare paidQuantity?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare servedQuantity?: number;
}

export class BulkUpdateDto implements IBulkUpdateDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  declare items: BulkUpdateItemDto[];
}
