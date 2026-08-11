import type { EstablishmentId, SaveMenuDraftDto } from '@coaster/common';

export class SaveMenuDraftCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: SaveMenuDraftDto,
  ) {}
}
