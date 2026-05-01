import { IsArray, IsString } from 'class-validator';

export class ImportTemplatesDto {
  @IsArray()
  @IsString({ each: true })
  declare categoryTemplateIds: string[];
}
