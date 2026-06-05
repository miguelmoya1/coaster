import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductDeletedEvent } from '../../../events';
import { DeleteProductCommand } from './delete-product.command';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand, void> {
  readonly #logger = new Logger(DeleteProductHandler.name);

  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    this.#logger.debug(`Executing deleteProduct...`);
    await this._productsRepository.delete(command.productId);
    this.#logger.debug(`Publishing ProductDeletedEvent...`);
    this._eventBus.publish(new ProductDeletedEvent(command.barId, command.productId));
  }
}
