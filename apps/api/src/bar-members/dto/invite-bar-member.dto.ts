import type { InviteBarMemberDto as IInviteBarMemberDto } from '@coaster/common';
import { BarRole, ErrorCodes } from '@coaster/common';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class InviteBarMemberDto implements IInviteBarMemberDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  email!: string;

  @IsOptional()
  @IsIn([BarRole.OWNER, BarRole.STAFF])
  role?: BarRole;
}
