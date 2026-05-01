import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryTemplateDto {
  @IsString()
  declare name: string;

  @IsString()
  @IsOptional()
  declare icon?: string;
}
