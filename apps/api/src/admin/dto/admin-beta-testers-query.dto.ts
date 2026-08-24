import type { AdminBetaTestersQuery } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdminBetaTestersQueryDto implements AdminBetaTestersQuery {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(120, { message: ErrorCodes.MAX_LENGTH })
  q?: string;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  page?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  @Max(100, { message: ErrorCodes.MAX_LENGTH })
  pageSize?: number;
}
