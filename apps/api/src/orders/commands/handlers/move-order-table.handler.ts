import { OrderStatus, TableStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asTableId, ErrorCodes } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderTableMovedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { MoveOrderTableCommand } from '../impl/move-order-table.command';

@CommandHandler(MoveOrderTableCommand)
export class MoveOrderTableHandler implements ICommandHandler<MoveOrderTableCommand, void> {
  readonly #logger = new Logger(MoveOrderTableHandler.name);

  constructor(
    private readonly readRepo: OrdersReadRepository,
    private readonly writeRepo: OrdersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: MoveOrderTableCommand): Promise<void> {
    this.#logger.debug(`Executing moveOrderTable...`);
    const existingOrder = await this.readRepo.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== OrderStatus.OPEN) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const newTable = await this.readRepo.findTableById(asTableId(command.dto.tableId));
    if (!newTable || newTable.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }
    if (newTable.status === TableStatus.OCCUPIED) {
      throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
    }

    const order = await this.writeRepo.moveTable(
      command.orderId,
      existingOrder.tableId,
      command.dto.tableId,
      newTable.name,
    );
    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderTableMovedEvent...`);
    this._eventBus.publish(
      new OrderTableMovedEvent(
        command.barId,
        mapped,
        existingOrder.tableId ? asTableId(existingOrder.tableId) : null,
        asTableId(command.dto.tableId),
      ),
    );
  }
}
