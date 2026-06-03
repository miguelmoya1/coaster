import type { BarRole, InviteBarMemberDto as IInviteBarMemberDto } from '@coaster/common';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { ErrorCodes } from '../../core';

export class InviteBarMemberDto implements IInviteBarMemberDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  email!: string;

  @IsOptional()
  @IsIn(['OWNER', 'STAFF'])
  role?: BarRole;
}
