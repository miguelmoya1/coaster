import type { UpdateEstablishmentMemberRoleDto } from '@coaster/common';
import { EstablishmentRole, ErrorCodes } from '@coaster/common';
import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto implements UpdateEstablishmentMemberRoleDto {
  @IsIn([EstablishmentRole.OWNER, EstablishmentRole.MANAGER, EstablishmentRole.STAFF], {
    message: ErrorCodes.INVALID_ROLE,
  })
  declare role: EstablishmentRole;
}
