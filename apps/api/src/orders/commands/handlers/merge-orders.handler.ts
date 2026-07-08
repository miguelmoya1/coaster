import { ErrorCodes, OrderStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asOrderId, asTableId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrdersMergedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { MergeOrdersCommand } from '../impl/merge-orders.command';

@CommandHandler(MergeOrdersCommand)
export class MergeOrdersHandler implements ICommandHandler<MergeOrdersCommand, void> {
  readonly #logger = new Logger(MergeOrdersHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: MergeOrdersCommand): Promise<void> {
    this.#logger.debug(`Executing mergeOrders...`);
    const orders = await this.readRepo.findOrdersByIds(command.dto.orderIds);
    if (orders.length !== command.dto.orderIds.length) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonBarOrders = orders.filter((o) => o.barId !== command.barId);
    if (nonBarOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonOpenOrders = orders.filter((o) => o.status !== OrderStatus.OPEN);
    if (nonOpenOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    if (command.dto.targetTableId) {
      const targetTable = await this.readRepo.findTableById(asTableId(command.dto.targetTableId));
      if (!targetTable || targetTable.barId !== command.barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
    }

    const [primaryOrder, ...sourceOrders] = orders;
    const sourceOrdersData = sourceOrders.map((o) => ({ id: asOrderId(o.id), tableId: o.tableId }));

    const result = await this.writeRepo.mergeOrders(
      asOrderId(primaryOrder.id),
      sourceOrdersData,
      command.dto.targetTableId ?? null,
      primaryOrder.tableId,
      primaryOrder.tableName,
    );

    const mapped = OrdersMapper.toDomain(result);
    this.#logger.debug(`Publishing OrdersMergedEvent...`);
    this._eventBus.publish(
      new OrdersMergedEvent(
        command.barId,
        mapped,
        sourceOrders.map((o) => ({
          id: asOrderId(o.id),
          tableId: o.tableId ? asTableId(o.tableId) : null,
        })),
      ),
    );
  }
}
