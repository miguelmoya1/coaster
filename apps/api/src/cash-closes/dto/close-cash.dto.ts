import type { CloseCashDto as ICloseCashDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CloseCashDto implements ICloseCashDto {
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare openingFloat: number;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  declare countedCash: number;

  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(500, { message: ErrorCodes.MAX_LENGTH })
  declare notes?: string;
}
