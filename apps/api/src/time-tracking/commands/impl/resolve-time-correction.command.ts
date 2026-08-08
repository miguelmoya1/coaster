import type { BarId, TimeEntryId, User } from '@coaster/common';
import { ResolveTimeCorrectionDto } from '../../dto/resolve-time-correction.dto';

export class ResolveTimeCorrectionCommand {
  constructor(
    public readonly barId: BarId,
    public readonly entryId: TimeEntryId,
    public readonly actor: User,
    public readonly approved: boolean,
    public readonly dto: ResolveTimeCorrectionDto,
  ) {}
}
