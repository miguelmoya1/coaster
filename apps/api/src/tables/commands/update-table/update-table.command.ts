import { BarId, TableId, UpdateTableDto } from '@coaster/common';

export class UpdateTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly tableId: TableId,
    public readonly dto: UpdateTableDto,
  ) {}
}
