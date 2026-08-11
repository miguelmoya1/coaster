import { LANGUAGES } from '@coaster/common';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class MenuItemDraftDto {
  @IsOptional()
  @IsUUID()
  declare productId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  declare price?: number;

  @IsObject()
  declare translations: Record<string, unknown>;
}

export class MenuSectionDraftDto {
  @IsObject()
  declare translations: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDraftDto)
  declare items: MenuItemDraftDto[];
}

export class SaveMenuDraftDto {
  @IsString()
  @MaxLength(80)
  declare name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(LANGUAGES, { each: true })
  declare languages: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuSectionDraftDto)
  declare sections: MenuSectionDraftDto[];
}
