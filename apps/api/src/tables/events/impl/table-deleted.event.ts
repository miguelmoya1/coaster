import type { EstablishmentId, TableId } from '@coaster/common';

export class TableDeletedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly tableId: TableId,
  ) {}
}
