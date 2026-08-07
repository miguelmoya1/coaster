import type { UpdateAdminUserDto as IUpdateAdminUserDto } from '@coaster/common';
import { ErrorCodes, Role } from '@coaster/common';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const ROLES = [Role.USER, Role.ADMIN] as const;

export class UpdateAdminUserDto implements IUpdateAdminUserDto {
  @IsOptional()
  @IsIn(ROLES, { message: ErrorCodes.INVALID_ROLE })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: ErrorCodes.INVALID_TYPE })
  active?: boolean;
}
