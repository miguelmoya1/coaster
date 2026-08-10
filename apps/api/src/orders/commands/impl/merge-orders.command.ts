import type { EstablishmentId } from '@coaster/common';
import { MergeOrdersDto } from '../../dto/merge-orders.dto';

export class MergeOrdersCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: MergeOrdersDto,
  ) {}
}
