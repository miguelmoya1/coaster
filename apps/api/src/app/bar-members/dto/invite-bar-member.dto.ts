import {
  BarRole,
  InviteBarMemberDto as IInviteBarMemberDto,
} from '@coaster/interfaces';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export class InviteBarMemberDto implements IInviteBarMemberDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsEnum(BarRole, { message: 'Rol no válido' })
  @IsNotEmpty()
  role: BarRole;
}
