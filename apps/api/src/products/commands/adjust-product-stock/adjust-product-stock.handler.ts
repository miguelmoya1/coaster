import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductStockChangedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { AdjustProductStockCommand } from './adjust-product-stock.command';

@CommandHandler(AdjustProductStockCommand)
export class AdjustProductStockHandler implements ICommandHandler<AdjustProductStockCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AdjustProductStockCommand): Promise<void> {
    const product = await this._productsRepository.update(command.productId, {
      currentStock: {
        increment: command.delta,
      },
    });
    const mapped = ProductsMapper.toDomain(product);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
