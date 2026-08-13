import type { EstablishmentId, User } from '@coaster/common';

export class RenameEstablishmentCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly name: string,
    public readonly actor: User,
  ) {}
}
