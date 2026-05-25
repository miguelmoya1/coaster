import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductCommand } from './update-product.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { BarGateway } from '../../../core';
import { asCategoryId, ErrorCodes, SocketEvents } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
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
    this._barGateway.server.to(command.barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, mapped);
  }
}
