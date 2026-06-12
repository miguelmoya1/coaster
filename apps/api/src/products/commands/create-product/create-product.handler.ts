import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asCategoryId, ErrorCodes } from '../../../core';
import { ProductCreatedEvent } from '../../../events';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { CreateProductCommand } from './create-product.command';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand, void> {
  readonly #logger = new Logger(CreateProductHandler.name);

  constructor(
    private readonly readRepo: ProductsReadRepository,
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateProductCommand): Promise<void> {
    this.#logger.debug(`Executing createProduct...`);
    const validCategoryId = asCategoryId(command.dto.categoryId);
    const isValidCategory = await this.readRepo.checkCategoryBelongsToBar(validCategoryId, command.barId);

    if (!isValidCategory) {
      throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const createData = {
      name: command.dto.name,
      price: command.dto.price ?? 0,
      currentStock: command.dto.currentStock ?? 0,
      minStockAlert: command.dto.minStockAlert ?? 0,
    };

    const product = await this.writeRepo.create(validCategoryId, createData);
    const mapped = ProductsMapper.toDomain(product);

    this.#logger.debug(`Publishing ProductCreatedEvent...`);
    this._eventBus.publish(new ProductCreatedEvent(command.barId, mapped));
  }
}
