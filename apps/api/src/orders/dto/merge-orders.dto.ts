import { ErrorCodes, MergeOrdersDto as IMergeOrdersDto } from '@coaster/common';
import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class MergeOrdersDto implements IMergeOrdersDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(2, { message: ErrorCodes.INVALID_ORDER_IDS })
  @IsUUID('4', { each: true, message: ErrorCodes.INVALID_TYPE })
  declare orderIds: string[];

  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare targetTableId?: string;
}
