import type { BarId, User } from '@coaster/common';
import { CreateTimeEntryDto } from '../../dto/create-time-entry.dto';

export class CreateTimeEntryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly actor: User,
    public readonly dto: CreateTimeEntryDto,
  ) {}
}
