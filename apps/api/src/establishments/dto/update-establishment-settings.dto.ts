import type { UpdateEstablishmentSettingsDto as IUpdateEstablishmentSettingsDto } from '@coaster/common';
import { EstablishmentModule, ErrorCodes, LANGUAGES } from '@coaster/common';
import type { Language } from '@coaster/common';
import { ArrayUnique, IsArray, IsEnum, IsIn, IsOptional } from 'class-validator';

export class UpdateEstablishmentSettingsDto implements IUpdateEstablishmentSettingsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(EstablishmentModule, { each: true, message: ErrorCodes.INVALID_TYPE })
  declare modules: EstablishmentModule[];

  @IsIn(LANGUAGES, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare language?: Language;
}
