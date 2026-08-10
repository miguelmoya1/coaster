import type { EstablishmentId, Table } from '@coaster/common';

export class TableUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly table: Table,
  ) {}
}
