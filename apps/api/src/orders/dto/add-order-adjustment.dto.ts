import type { AddOrderAdjustmentDto as IAddOrderAdjustmentDto, OrderItemId } from '@coaster/common';
import { AdjustmentTarget, AdjustmentType, ErrorCodes } from '@coaster/common';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'percentageWithinRange' })
class PercentageWithinRange implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments): boolean {
    const { type } = args.object as AddOrderAdjustmentDto;

    return type !== AdjustmentType.PERCENTAGE || value <= 100;
  }
}

export class AddOrderAdjustmentDto implements IAddOrderAdjustmentDto {
  @IsEnum(AdjustmentTarget, { message: ErrorCodes.INVALID_TYPE })
  declare target: AdjustmentTarget;

  @IsEnum(AdjustmentType, { message: ErrorCodes.INVALID_TYPE })
  declare type: AdjustmentType;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.INVALID_TYPE })
  @Validate(PercentageWithinRange, { message: ErrorCodes.INVALID_TYPE })
  declare value: number;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare reason?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare itemId?: OrderItemId;
}
