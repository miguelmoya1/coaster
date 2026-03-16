import { UpdateUserDto as IUpdateUserDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto implements IUpdateUserDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  name?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  photoUrl?: string;
}
