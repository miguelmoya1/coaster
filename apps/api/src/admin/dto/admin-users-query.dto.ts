import type { AdminUsersQuery } from '@coaster/common';
import { ErrorCodes, Role } from '@coaster/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const ROLES = [Role.USER, Role.ADMIN] as const;

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class AdminUsersQueryDto implements AdminUsersQuery {
  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(120, { message: ErrorCodes.MAX_LENGTH })
  q?: string;

  @IsOptional()
  @IsIn(ROLES, { message: ErrorCodes.INVALID_ROLE })
  role?: Role;

  @IsOptional()
  @Type(() => String)
  @Transform(toBoolean)
  @IsBoolean({ message: ErrorCodes.INVALID_TYPE })
  active?: boolean;

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
