import { asCategoryId, ErrorCodes } from '../../../core';
import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductUpdatedEvent } from '../../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductCommand } from './update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  readonly #logger = new Logger(UpdateProductHandler.name);

  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    this.#logger.debug(`Executing updateProduct...`);
    if (command.dto.categoryId) {
      const validCategoryId = asCategoryId(command.dto.categoryId);
      const isValidCategory = await this._productsRepository.checkCategoryBelongsToBar(validCategoryId, command.barId);

      if (!isValidCategory) {
        throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    const product = await this._productsRepository.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductUpdatedEvent...`);
    this._eventBus.publish(new ProductUpdatedEvent(command.barId, mapped));
  }
}
