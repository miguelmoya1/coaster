import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class MergeOrdersDto implements Coaster.MergeOrdersDto {
  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(2, { message: ErrorCodes.INVALID_ORDER_IDS })
  @IsUUID('4', { each: true, message: ErrorCodes.INVALID_TYPE })
  declare orderIds: Coaster.OrderId[];

  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare targetTableId?: Coaster.TableId;
}
