import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { UpdateProductStockCommand } from './update-product-stock.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { ProductStockChangedEvent } from '../../events';

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler implements ICommandHandler<UpdateProductStockCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductStockCommand): Promise<void> {
    const product = await this._productsRepository.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
