import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { ProductsMapper } from '../../mappers/products.mapper';
import { UpdateProductStockCommand } from '../impl/update-product-stock.command';

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler implements ICommandHandler<UpdateProductStockCommand, void> {
  readonly #logger = new Logger(UpdateProductStockHandler.name);

  constructor(
    private readonly readRepo: ProductsReadRepository,
    private readonly writeRepo: ProductsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductStockCommand): Promise<void> {
    this.#logger.debug(`Executing updateProductStock...`);

    const belongsToEstablishment = await this.readRepo.checkProductBelongsToEstablishment(
      command.productId,
      command.establishmentId,
    );

    if (!belongsToEstablishment) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const product = await this.writeRepo.update(command.productId, command.dto);
    const mapped = ProductsMapper.toDomain(product);
    this.#logger.debug(`Publishing ProductStockChangedEvent...`);
    this._eventBus.publish(new ProductStockChangedEvent(command.establishmentId, mapped));
  }
}
