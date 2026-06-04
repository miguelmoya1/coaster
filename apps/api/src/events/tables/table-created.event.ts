import type { BarId, Table } from '@coaster/common';

export class TableCreatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly table: Table,
  ) {}
}
