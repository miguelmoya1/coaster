import type { EstablishmentId, ShiftExchangeId, UserId } from '@coaster/common';

export class DeleteExchangeCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly exchangeId: ShiftExchangeId,
    public readonly userId: UserId,
  ) {}
}
