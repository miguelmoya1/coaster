import { ErrorCodes, ShiftExchangeStatus } from '@coaster/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DbBarRole } from '../../../core/db';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { DeleteExchangeCommand } from '../impl/delete-exchange.command';

@CommandHandler(DeleteExchangeCommand)
export class DeleteExchangeHandler implements ICommandHandler<DeleteExchangeCommand, void> {
  constructor(
    private readonly readRepo: ShiftExchangesReadRepository,
    private readonly writeRepo: ShiftExchangesWriteRepository,
  ) {}

  async execute(command: DeleteExchangeCommand): Promise<void> {
    const exchange = await this.readRepo.getExchangeById(command.exchangeId);

    if (!exchange || exchange.shift.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND);
    }

    const member = await this.readRepo.getBarMember(command.userId, command.barId);

    if (!member || !member.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    // If the user is not an OWNER, enforce ownership of the exchange request and pending status
    if (member.role !== DbBarRole.OWNER) {
      if (exchange.requesterId !== command.userId) {
        throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
      }

      if (exchange.status !== ShiftExchangeStatus.PENDING) {
        throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
      }
    }

    await this.writeRepo.deleteExchange(command.exchangeId);
  }
}
