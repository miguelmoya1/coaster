import { ErrorCodes, MoveTableDto as IMoveTableDto } from '@coaster/common';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MoveTableDto implements IMoveTableDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare tableId: string;
}
