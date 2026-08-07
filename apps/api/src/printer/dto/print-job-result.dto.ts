import type { PrintJobResultDto as IPrintJobResultDto } from '@coaster/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PrintJobResultDto implements IPrintJobResultDto {
  @IsIn(['printed', 'failed'])
  status!: 'printed' | 'failed';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  error?: string;
}
