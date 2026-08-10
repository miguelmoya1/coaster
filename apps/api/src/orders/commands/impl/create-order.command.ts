import type { EstablishmentId } from '@coaster/common';
import { CreateOrderDto } from '../../dto/create-order.dto';

export class CreateOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateOrderDto,
  ) {}
}
