import type { EstablishmentId, User } from '@coaster/common';
import { CreateTimeEntryDto } from '../../dto/create-time-entry.dto';

export class CreateTimeEntryCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly actor: User,
    public readonly dto: CreateTimeEntryDto,
  ) {}
}
