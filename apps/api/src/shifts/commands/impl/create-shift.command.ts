import type { BarId } from '@coaster/common';
import { CreateShiftDto } from '../../dto/create-shift.dto';

export class CreateShiftCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateShiftDto,
  ) {}
}
