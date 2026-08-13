import { ErrorCodes } from '@coaster/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const MAX_FILES_PER_REQUEST = 10;

export class MediaFileRequestDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @MaxLength(255, { message: ErrorCodes.MAX_LENGTH })
  filename!: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(ALLOWED_IMAGE_TYPES, { message: ErrorCodes.INVALID_TYPE })
  contentType!: string;
}

export class GenerateUploadUrlsDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @IsIn(['products', 'templates', 'users', 'establishments', 'categories'], { message: ErrorCodes.INVALID_TYPE })
  entityType!: string;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @ArrayMinSize(1, { message: ErrorCodes.REQUIRED })
  @ArrayMaxSize(MAX_FILES_PER_REQUEST, { message: ErrorCodes.MAX_LENGTH })
  @ValidateNested({ each: true })
  @Type(() => MediaFileRequestDto)
  files!: MediaFileRequestDto[];
}
