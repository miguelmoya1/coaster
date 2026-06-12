import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes, ShiftExchangeStatus, asShiftId } from '../../../core';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { AcceptExchangeCommand } from './accept-exchange.command';

@CommandHandler(AcceptExchangeCommand)
export class AcceptExchangeHandler implements ICommandHandler<AcceptExchangeCommand, void> {
  constructor(
    private readonly readRepo: ShiftExchangesReadRepository,
    private readonly writeRepo: ShiftExchangesWriteRepository,
  ) {}

  async execute(command: AcceptExchangeCommand): Promise<void> {
    const exchange = await this.readRepo.getExchangeById(command.exchangeId);

    if (!exchange) {
      throw new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND);
    }

    if (exchange.status !== (ShiftExchangeStatus.PENDING as string)) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }

    if (exchange.shift.barId !== command.barId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (exchange.requesterId === command.acceptingUserId) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }

    if (exchange.targetId && exchange.targetId !== command.acceptingUserId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    await this.writeRepo.acceptExchangeAndSwapShift(
      command.exchangeId,
      asShiftId(exchange.shiftId),
      command.acceptingUserId,
    );
  }
}
