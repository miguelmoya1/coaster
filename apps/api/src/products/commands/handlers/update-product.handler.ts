import { ErrorCodes, asCategoryId } from '@coaster/common';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductUpdatedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductCommand } from '../impl/update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  readonly #logger = new Logger(UpdateProductHandler.name);

  constructor(
    private readonly readRepo: ProductsReadRepository,
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    this.#logger.debug(`Executing updateProduct...`);

    const belongsToEstablishment = await this.readRepo.checkProductBelongsToEstablishment(
      command.productId,
      command.establishmentId,
    );

    if (!belongsToEstablishment) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    if (command.dto.categoryId) {
      const validCategoryId = asCategoryId(command.dto.categoryId);
      const isValidCategory = await this.readRepo.checkCategoryBelongsToEstablishment(
        validCategoryId,
        command.establishmentId,
      );

      if (!isValidCategory) {
        throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    const product = await this.writeRepo.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductUpdatedEvent...`);
    this._eventBus.publish(new ProductUpdatedEvent(command.establishmentId, mapped));
  }
}
