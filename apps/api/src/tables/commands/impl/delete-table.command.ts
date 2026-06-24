import type { BarId, TableId } from '@coaster/common';

export class DeleteTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly tableId: TableId,
  ) {}
}
