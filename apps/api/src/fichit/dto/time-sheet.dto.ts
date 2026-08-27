import { IsIn, IsISO8601, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class TimeSheetQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

const TYPES = ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END'];

export class ManualPunchDto {
  @IsString()
  userId!: string;

  @IsIn(TYPES)
  type!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}

export class CorrectPunchDto {
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsIn(TYPES)
  type?: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}

export class VoidPunchDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}
