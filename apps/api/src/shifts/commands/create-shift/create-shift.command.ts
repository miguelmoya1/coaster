import { BarId, CreateShiftDto } from '@coaster/common';

export class CreateShiftCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateShiftDto,
  ) {}
}
