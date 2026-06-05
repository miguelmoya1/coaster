import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductStockChangedEvent } from '../../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductStockCommand } from './update-product-stock.command';

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler implements ICommandHandler<UpdateProductStockCommand, void> {
  readonly #logger = new Logger(UpdateProductStockHandler.name);

  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductStockCommand): Promise<void> {
    this.#logger.debug(`Executing updateProductStock...`);
    const product = await this._productsRepository.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductStockChangedEvent...`);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
