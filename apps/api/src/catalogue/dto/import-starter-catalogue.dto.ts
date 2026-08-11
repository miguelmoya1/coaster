import { IsArray, IsOptional, IsString } from 'class-validator';

export class ImportStarterCatalogueDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare categoryKeys?: string[];
}
