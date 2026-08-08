import type { UpdateBarMemberRoleDto } from '@coaster/common';
import { BarRole, ErrorCodes } from '@coaster/common';
import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto implements UpdateBarMemberRoleDto {
  @IsIn([BarRole.OWNER, BarRole.MANAGER, BarRole.STAFF], { message: ErrorCodes.INVALID_ROLE })
  declare role: BarRole;
}
