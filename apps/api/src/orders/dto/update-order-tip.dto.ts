import type { UpdateOrderTipDto as IUpdateOrderTipDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsInt, Min } from 'class-validator';

export class UpdateOrderTipDto implements IUpdateOrderTipDto {
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare tipAmount: number;
}
