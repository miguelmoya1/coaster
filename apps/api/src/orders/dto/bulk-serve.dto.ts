import { ErrorCodes, BulkServeDto as IBulkServeDto, BulkServeItemDto as IBulkServeItemDto } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsUUID, Min, ValidateNested } from 'class-validator';

export class BulkServeItemDto implements IBulkServeItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare itemId: string;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare servedQuantity: number;
}

export class BulkServeDto implements IBulkServeDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkServeItemDto)
  declare items: BulkServeItemDto[];
}
