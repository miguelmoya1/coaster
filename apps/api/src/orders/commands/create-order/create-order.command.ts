import { BarId, CreateOrderDto } from '@coaster/common';

export class CreateOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateOrderDto,
  ) {}
}
