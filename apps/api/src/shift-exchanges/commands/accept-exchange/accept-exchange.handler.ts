import { ErrorCodes, ShiftExchangeStatus, asShiftId } from '../../../core';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { AcceptExchangeCommand } from './accept-exchange.command';

@CommandHandler(AcceptExchangeCommand)
export class AcceptExchangeHandler implements ICommandHandler<AcceptExchangeCommand, any> {
  constructor(private readonly _shiftExchangesRepository: ShiftExchangesRepository) {}

  async execute(command: AcceptExchangeCommand): Promise<any> {
    const exchange = await this._shiftExchangesRepository.getExchangeById(command.exchangeId);

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

    const [updatedExchange] = await this._shiftExchangesRepository.acceptExchangeAndSwapShift(
      command.exchangeId,
      asShiftId(exchange.shiftId),
      command.acceptingUserId,
    );

    return updatedExchange;
  }
}
