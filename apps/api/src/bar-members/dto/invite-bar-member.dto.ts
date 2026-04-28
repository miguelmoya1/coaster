import {
  BarRole,
  ErrorCodes,
  InviteBarMemberDto as IInviteBarMemberDto,
} from '@coaster/common';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class InviteBarMemberDto implements IInviteBarMemberDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare email: string;

  @IsOptional()
  @IsEnum(BarRole, { message: ErrorCodes.INVALID_ROLE })
  declare role: BarRole;
}
