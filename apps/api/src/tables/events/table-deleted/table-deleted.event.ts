import type { BarId, TableId } from '@coaster/common';

export class TableDeletedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly tableId: TableId,
  ) {}
}
