import type { InviteEstablishmentMemberDto as IInviteEstablishmentMemberDto } from '@coaster/common';
import { EstablishmentRole, ErrorCodes } from '@coaster/common';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class InviteEstablishmentMemberDto implements IInviteEstablishmentMemberDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  email!: string;

  @IsOptional()
  @IsIn([EstablishmentRole.OWNER, EstablishmentRole.MANAGER, EstablishmentRole.STAFF], {
    message: ErrorCodes.INVALID_ROLE,
  })
  role?: EstablishmentRole;
}
