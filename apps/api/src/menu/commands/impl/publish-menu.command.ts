import type { EstablishmentId } from '@coaster/common';

export class PublishMenuCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly published: boolean,
  ) {}
}
