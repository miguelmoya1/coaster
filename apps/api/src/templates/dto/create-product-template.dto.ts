import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProductTemplateDto {
  @IsString()
  declare name: string;

  @IsInt()
  @IsOptional()
  declare price?: number;

  @IsString()
  declare categoryId: string;
}
