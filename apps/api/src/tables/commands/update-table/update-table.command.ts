import type { BarId, TableId } from '@coaster/common';
import { UpdateTableDto } from '../../dto/update-table.dto';

export class UpdateTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly tableId: TableId,
    public readonly dto: UpdateTableDto,
  ) {}
}
