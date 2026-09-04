import type { EstablishmentId, User } from '@coaster/common';
import { ClockDto } from '../../dto/clock.dto';

export class ClockCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly actor: User,
    public readonly dto: ClockDto,
  ) {}
}
