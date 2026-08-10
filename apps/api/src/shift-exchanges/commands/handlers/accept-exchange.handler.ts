import { ErrorCodes, ShiftExchangeStatus, asShiftId } from '@coaster/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { AcceptExchangeCommand } from '../impl/accept-exchange.command';

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

    if (exchange.shift.establishmentId !== command.establishmentId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (exchange.requesterId === command.acceptingUserId) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }

    if (exchange.targetId && exchange.targetId !== command.acceptingUserId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    // Taking over a shift that is already running helps nobody: the hours are already being worked.
    if (exchange.shift.startTime.getTime() <= Date.now()) {
      throw new BadRequestException(ErrorCodes.EXCHANGE_SHIFT_ALREADY_STARTED);
    }

    const claimed = await this.writeRepo.acceptExchangeAndSwapShift(
      command.exchangeId,
      asShiftId(exchange.shiftId),
      command.acceptingUserId,
    );

    if (!claimed) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }
  }
}
