import { IsArray, IsString } from 'class-validator';

export class ImportTemplatesDto {
  @IsArray()
  @IsString({ each: true })
  categoryTemplateIds: string[];
}
