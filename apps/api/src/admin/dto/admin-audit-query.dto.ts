import type { AdminAuditQuery } from '@coaster/common';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const ACTIONS = Object.values(AdminAuditAction);
const TARGET_TYPES = Object.values(AdminAuditTargetType);

export class AdminAuditQueryDto implements AdminAuditQuery {
  @IsOptional()
  @IsIn(TARGET_TYPES, { message: ErrorCodes.INVALID_TYPE })
  targetType?: AdminAuditTargetType;

  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(64, { message: ErrorCodes.MAX_LENGTH })
  targetId?: string;

  @IsOptional()
  @IsIn(ACTIONS, { message: ErrorCodes.INVALID_TYPE })
  action?: AdminAuditAction;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  page?: number;

  @IsOptional()
  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.MIN_LENGTH })
  @Max(100, { message: ErrorCodes.MAX_LENGTH })
  pageSize?: number;
}
