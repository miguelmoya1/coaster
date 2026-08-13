import type { EstablishmentId, Table } from '@coaster/common';

export class TableCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly table: Table,
  ) {}
}
