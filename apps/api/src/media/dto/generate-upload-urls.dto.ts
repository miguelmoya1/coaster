import { IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaFileRequestDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}

export class GenerateUploadUrlsDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['products', 'templates', 'users', 'bars', 'categories'])
  entityType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaFileRequestDto)
  files!: MediaFileRequestDto[];
}
