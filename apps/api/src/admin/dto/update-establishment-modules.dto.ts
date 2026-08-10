import type { UpdateEstablishmentSettingsDto } from '@coaster/common';
import { EstablishmentModule, ErrorCodes } from '@coaster/common';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

export class UpdateEstablishmentModulesDto implements UpdateEstablishmentSettingsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(EstablishmentModule, { each: true, message: ErrorCodes.INVALID_TYPE })
  declare modules: EstablishmentModule[];
}
