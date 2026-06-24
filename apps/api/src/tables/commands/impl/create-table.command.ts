import type { BarId } from '@coaster/common';
import { CreateTableDto } from '../../dto/create-table.dto';

export class CreateTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateTableDto,
  ) {}
}
