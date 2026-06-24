import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductStockCommand } from '../impl/update-product-stock.command';

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler implements ICommandHandler<UpdateProductStockCommand, void> {
  readonly #logger = new Logger(UpdateProductStockHandler.name);

  constructor(
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductStockCommand): Promise<void> {
    this.#logger.debug(`Executing updateProductStock...`);
    const product = await this.writeRepo.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductStockChangedEvent...`);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
