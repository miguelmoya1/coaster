import { BarId, CreateShiftExchangeDto, ShiftId, UserId } from '@coaster/common';

export class RequestExchangeCommand {
  constructor(
    public readonly barId: BarId,
    public readonly shiftId: ShiftId,
    public readonly requesterId: UserId,
    public readonly dto: CreateShiftExchangeDto,
  ) {}
}
