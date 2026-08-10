import type { EstablishmentId, TableId } from '@coaster/common';
import { UpdateTableDto } from '../../dto/update-table.dto';

export class UpdateTableCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly tableId: TableId,
    public readonly dto: UpdateTableDto,
  ) {}
}
