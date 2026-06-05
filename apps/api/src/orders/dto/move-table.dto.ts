import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MoveTableDto implements Coaster.MoveTableDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare tableId: Coaster.TableId;
}
