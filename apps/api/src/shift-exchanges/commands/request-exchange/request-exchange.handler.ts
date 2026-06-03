import { ErrorCodes } from '../../../core';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { RequestExchangeCommand } from './request-exchange.command';

@CommandHandler(RequestExchangeCommand)
export class RequestExchangeHandler implements ICommandHandler<RequestExchangeCommand, any> {
  constructor(private readonly _shiftExchangesRepository: ShiftExchangesRepository) {}

  async execute(command: RequestExchangeCommand): Promise<any> {
    const shift = await this._shiftExchangesRepository.getShiftById(command.shiftId);

    if (!shift) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    if (shift.barId !== command.barId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (shift.userId !== command.requesterId) {
      throw new ForbiddenException(ErrorCodes.NOT_YOUR_SHIFT);
    }

    const hasPending = await this._shiftExchangesRepository.hasPendingExchangeForShift(command.shiftId);
    if (hasPending) {
      throw new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_PENDING);
    }

    return this._shiftExchangesRepository.createExchange(command.shiftId, command.requesterId, command.dto.targetId);
  }
}
