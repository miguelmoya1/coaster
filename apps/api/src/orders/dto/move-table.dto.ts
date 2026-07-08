import type { MoveTableDto as IMoveTableDto, TableId } from '@coaster/common';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ErrorCodes } from '../../core';

export class MoveTableDto implements IMoveTableDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare tableId: TableId;
}
