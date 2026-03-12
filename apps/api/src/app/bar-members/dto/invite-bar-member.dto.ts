import {
  BarRole,
  InviteBarMemberDto as IInviteBarMemberDto,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export class InviteBarMemberDto implements IInviteBarMemberDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  email: string;

  @IsEnum(BarRole, { message: ErrorCodes.INVALID_ROLE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  role: BarRole;
}
