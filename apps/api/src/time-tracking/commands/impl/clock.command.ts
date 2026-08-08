import type { BarId, User } from '@coaster/common';
import { ClockDto } from '../../dto/clock.dto';

export class ClockCommand {
  constructor(
    public readonly barId: BarId,
    public readonly actor: User,
    public readonly dto: ClockDto,
  ) {}
}
