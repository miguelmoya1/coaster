import type { BarId } from '@coaster/common';
import { CreateOrderDto } from '../../dto/create-order.dto';

export class CreateOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateOrderDto,
  ) {}
}
