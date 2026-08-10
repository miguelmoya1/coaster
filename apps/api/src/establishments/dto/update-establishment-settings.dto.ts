import type { UpdateEstablishmentSettingsDto as IUpdateEstablishmentSettingsDto } from '@coaster/common';
import { EstablishmentModule, ErrorCodes } from '@coaster/common';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

export class UpdateEstablishmentSettingsDto implements IUpdateEstablishmentSettingsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(EstablishmentModule, { each: true, message: ErrorCodes.INVALID_TYPE })
  declare modules: EstablishmentModule[];
}
