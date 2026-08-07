import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductDeletedEvent } from '../../events';
import { DeleteProductCommand } from '../impl/delete-product.command';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand, void> {
  readonly #logger = new Logger(DeleteProductHandler.name);

  constructor(
    private readonly readRepo: ProductsReadRepository,
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    this.#logger.debug(`Executing deleteProduct...`);

    const belongsToBar = await this.readRepo.checkProductBelongsToBar(command.productId, command.barId);

    if (!belongsToBar) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    await this.writeRepo.delete(command.productId);
    this.#logger.debug(`Publishing ProductDeletedEvent...`);
    this._eventBus.publish(new ProductDeletedEvent(command.barId, command.productId));
  }
}
