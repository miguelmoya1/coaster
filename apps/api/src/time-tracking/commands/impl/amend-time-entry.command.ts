import type { BarId, TimeEntryId, User } from '@coaster/common';
import { AmendTimeEntryDto } from '../../dto/amend-time-entry.dto';

export class AmendTimeEntryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly entryId: TimeEntryId,
    public readonly actor: User,
    public readonly dto: AmendTimeEntryDto,
  ) {}
}
