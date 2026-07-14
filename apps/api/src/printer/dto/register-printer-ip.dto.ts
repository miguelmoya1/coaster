import type { BarId, RegisterPrinterIpDto as IRegisterPrinterIpDto } from '@coaster/common';
import { IsIP, IsNotEmpty, IsString } from 'class-validator';

export class RegisterPrinterIpDto implements IRegisterPrinterIpDto {
  @IsString()
  @IsNotEmpty()
  barId!: BarId;

  @IsIP()
  @IsNotEmpty()
  ipAddress!: string;
}
