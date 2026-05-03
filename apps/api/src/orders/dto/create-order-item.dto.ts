import { ErrorCodes, CreateOrderItemDto as ICreateOrderItemDto } from '@coaster/common';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto implements ICreateOrderItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare productId: string;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare quantity: number;
}
