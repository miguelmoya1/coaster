import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from './create-product.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { BarGateway } from '../../../core';
import { asCategoryId, ErrorCodes, SocketEvents, ProductId } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand, { id: ProductId }> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: CreateProductCommand): Promise<{ id: ProductId }> {
    const validCategoryId = asCategoryId(command.dto.categoryId);
    const isValidCategory = await this._productsRepository.checkCategoryBelongsToBar(validCategoryId, command.barId);

    if (!isValidCategory) {
      throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const createData = {
      name: command.dto.name,
      price: command.dto.price ?? 0,
      currentStock: command.dto.currentStock ?? 0,
      minStockAlert: command.dto.minStockAlert ?? 0,
    };

    const product = await this._productsRepository.create(validCategoryId, createData);
    const mapped = ProductsMapper.toDomain(product);

    this._barGateway.server.to(command.barId).emit(SocketEvents.PRODUCT_CREATED, mapped);
    return { id: mapped.id };
  }
}
