import type { BarId, CreateTableDto } from '@coaster/common';

export class CreateTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateTableDto,
  ) {}
}
