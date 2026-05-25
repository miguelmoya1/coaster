import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteProductCommand } from './delete-product.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand, void> {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    await this._productsRepository.delete(command.productId);
    this._barGateway.server.to(command.barId).emit(SocketEvents.PRODUCT_DELETED, { id: command.productId });
  }
}
