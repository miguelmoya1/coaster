import type { EstablishmentId, ShiftExchangeId, UserId } from '@coaster/common';

export class AcceptExchangeCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly exchangeId: ShiftExchangeId,
    public readonly acceptingUserId: UserId,
  ) {}
}
