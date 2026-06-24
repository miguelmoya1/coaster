import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { RequestExchangeCommand } from '../impl/request-exchange.command';

@CommandHandler(RequestExchangeCommand)
export class RequestExchangeHandler implements ICommandHandler<RequestExchangeCommand, void> {
  constructor(
    private readonly readRepo: ShiftExchangesReadRepository,
    private readonly writeRepo: ShiftExchangesWriteRepository,
  ) {}

  async execute(command: RequestExchangeCommand): Promise<void> {
    const shift = await this.readRepo.getShiftById(command.shiftId);

    if (!shift) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    if (shift.barId !== command.barId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (shift.userId !== command.requesterId) {
      throw new ForbiddenException(ErrorCodes.NOT_YOUR_SHIFT);
    }

    const hasPending = await this.readRepo.hasPendingExchangeForShift(command.shiftId);
    if (hasPending) {
      throw new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_PENDING);
    }

    await this.writeRepo.createExchange(command.shiftId, command.requesterId, command.dto.targetId);
  }
}
