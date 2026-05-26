import { asCategoryId, ErrorCodes } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';

import { ProductsRepository } from '../../data-access/products.repository';
import { ProductStockChangedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductCommand } from './update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    if (command.dto.categoryId) {
      const validCategoryId = asCategoryId(command.dto.categoryId);
      const isValidCategory = await this._productsRepository.checkCategoryBelongsToBar(validCategoryId, command.barId);

      if (!isValidCategory) {
        throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    const product = await this._productsRepository.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this._eventBus.publish(new ProductStockChangedEvent(command.barId, mapped));
  }
}
