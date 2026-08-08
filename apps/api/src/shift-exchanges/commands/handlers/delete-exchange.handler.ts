import { ErrorCodes, ShiftExchangeStatus } from '@coaster/common';
import { DbBarRole } from '@coaster/core/db';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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

    /*
     * Only live offers can be withdrawn. A closed exchange is the record of who took whose shift,
     * and deleting it undid nothing while losing that trace.
     */
    if (exchange.status !== ShiftExchangeStatus.PENDING) {
      throw new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_CLOSED);
    }

    const member = await this.readRepo.getBarMember(command.userId, command.barId);

    if (!member || !member.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (member.role !== DbBarRole.OWNER && exchange.requesterId !== command.userId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    await this.writeRepo.deleteExchange(command.exchangeId);
  }
}
