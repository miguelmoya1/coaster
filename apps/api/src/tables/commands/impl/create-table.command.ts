import type { EstablishmentId } from '@coaster/common';
import { CreateTableDto } from '../../dto/create-table.dto';

export class CreateTableCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateTableDto,
  ) {}
}
