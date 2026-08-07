import type { UpdateBarMemberRoleDto as IUpdateBarMemberRoleDto } from '@coaster/common';
import { BarRole, ErrorCodes } from '@coaster/common';
import { IsIn } from 'class-validator';

const BAR_ROLES = [BarRole.OWNER, BarRole.MANAGER, BarRole.STAFF] as const;

export class UpdateBarMemberRoleDto implements IUpdateBarMemberRoleDto {
  @IsIn(BAR_ROLES, { message: ErrorCodes.INVALID_ROLE })
  declare role: BarRole;
}
