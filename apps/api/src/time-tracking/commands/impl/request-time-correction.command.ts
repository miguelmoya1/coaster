import type { BarId, TimeEntryId, User } from '@coaster/common';
import { RequestTimeCorrectionDto } from '../../dto/request-time-correction.dto';

export class RequestTimeCorrectionCommand {
  constructor(
    public readonly barId: BarId,
    public readonly entryId: TimeEntryId,
    public readonly actor: User,
    public readonly dto: RequestTimeCorrectionDto,
  ) {}
}
