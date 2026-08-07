import type { BarId, RegisterPrinterIpDto as IRegisterPrinterIpDto } from '@coaster/common';
import { IsInt, IsIP, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class RegisterPrinterIpDto implements IRegisterPrinterIpDto {
  @IsString()
  @IsNotEmpty()
  barId!: BarId;

  @IsIP()
  @IsNotEmpty()
  ipAddress!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
}
