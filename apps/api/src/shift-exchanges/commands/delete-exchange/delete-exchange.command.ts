import type { BarId, ShiftExchangeId, UserId } from '@coaster/common';

export class DeleteExchangeCommand {
  constructor(
    public readonly barId: BarId,
    public readonly exchangeId: ShiftExchangeId,
    public readonly userId: UserId,
  ) {}
}
