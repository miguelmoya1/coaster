import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { AdjustProductStockCommand } from '../impl/adjust-product-stock.command';

@CommandHandler(AdjustProductStockCommand)
export class AdjustProductStockHandler implements ICommandHandler<AdjustProductStockCommand, void> {
  readonly #logger = new Logger(AdjustProductStockHandler.name);

  constructor(
    private readonly readRepo: ProductsReadRepository,
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AdjustProductStockCommand): Promise<void> {
    this.#logger.debug(`Executing adjustProductStock...`);

    const belongsToBar = await this.readRepo.checkProductBelongsToBar(command.productId, command.barId);

    if (!belongsToBar) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

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
