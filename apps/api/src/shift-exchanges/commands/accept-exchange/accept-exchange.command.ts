import { BarId, ShiftExchangeId, UserId } from '@coaster/common';

export class AcceptExchangeCommand {
  constructor(
    public readonly barId: BarId,
    public readonly exchangeId: ShiftExchangeId,
    public readonly acceptingUserId: UserId,
  ) {}
}
