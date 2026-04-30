import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProductTemplateDto {
  @IsString()
  name: string;

  @IsInt()
  @IsOptional()
  price?: number;

  @IsString()
  categoryId: string;
}
