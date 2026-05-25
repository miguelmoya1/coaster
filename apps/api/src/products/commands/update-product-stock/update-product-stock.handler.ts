import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductStockCommand } from './update-product-stock.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler implements ICommandHandler<UpdateProductStockCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: UpdateProductStockCommand): Promise<void> {
    const product = await this._productsRepository.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this._barGateway.server.to(command.barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, mapped);
  }
}
