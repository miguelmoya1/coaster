import * as Coaster from '@coaster/common';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MoveTableDto implements Coaster.MoveTableDto {
  @IsUUID('4', { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: Coaster.ErrorCodes.REQUIRED })
  declare tableId: Coaster.TableId;
}
