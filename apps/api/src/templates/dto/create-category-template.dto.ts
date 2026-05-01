import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
