import type { PrintTicketItemDto as IPrintTicketItemDto, PrintTicketPayloadDto } from '@coaster/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrintTicketItemDto implements IPrintTicketItemDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(20)
  price!: string;

  @IsString()
  @MaxLength(20)
  total!: string;
}

export class PrintTicketDto implements PrintTicketPayloadDto {
  @IsIn(['order', 'raw'])
  type!: 'order' | 'raw';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  establishmentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  table?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  date?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PrintTicketItemDto)
  items?: PrintTicketItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  total?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rawText?: string;
}
