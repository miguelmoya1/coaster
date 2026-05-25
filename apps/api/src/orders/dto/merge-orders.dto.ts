import * as Coaster from '@coaster/common';
import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class MergeOrdersDto implements Coaster.MergeOrdersDto {
  @IsArray({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(2, { message: Coaster.ErrorCodes.INVALID_ORDER_IDS })
  @IsUUID('4', { each: true, message: Coaster.ErrorCodes.INVALID_TYPE })
  declare orderIds: Coaster.OrderId[];

  @IsUUID('4', { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare targetTableId?: Coaster.TableId;
}
