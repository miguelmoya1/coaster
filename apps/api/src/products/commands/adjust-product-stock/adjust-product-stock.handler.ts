import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductStockChangedEvent } from '../../../events';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { AdjustProductStockCommand } from './adjust-product-stock.command';

@CommandHandler(AdjustProductStockCommand)
export class AdjustProductStockHandler implements ICommandHandler<AdjustProductStockCommand, void> {
  readonly #logger = new Logger(AdjustProductStockHandler.name);

  constructor(
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AdjustProductStockCommand): Promise<void> {
    this.#logger.debug(`Executing adjustProductStock...`);
    const product = await this.writeRepo.update(command.productId, {
      currentStock: {
        increment: command.delta,
      },
    });
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductStockChangedEvent...`);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
