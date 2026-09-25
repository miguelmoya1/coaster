import type { EstablishmentId, UserId } from '@coaster/common';
import { CloseCashDto } from '../../dto/close-cash.dto';

export class CloseCashCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly closedById: UserId,
    public readonly dto: CloseCashDto,
  ) {}
}
