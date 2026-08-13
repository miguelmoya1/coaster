import type { EstablishmentId, UserId } from '@coaster/common';
import { CreateOrderDto } from '../../dto/create-order.dto';

export class CreateOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateOrderDto,
    public readonly createdById: UserId | null = null,
  ) {}
}
