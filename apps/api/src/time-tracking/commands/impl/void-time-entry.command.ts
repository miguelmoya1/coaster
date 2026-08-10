import type { BarId, TimeEntryId, User } from '@coaster/common';
import { VoidTimeEntryDto } from '../../dto/void-time-entry.dto';

export class VoidTimeEntryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly entryId: TimeEntryId,
    public readonly actor: User,
    public readonly dto: VoidTimeEntryDto,
  ) {}
}
