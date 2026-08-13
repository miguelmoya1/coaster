import type { EstablishmentId, TableId } from '@coaster/common';

export class DeleteTableCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly tableId: TableId,
  ) {}
}
