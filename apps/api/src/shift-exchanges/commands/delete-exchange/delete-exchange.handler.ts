import { BarRole, ErrorCodes, ShiftExchangeStatus } from '../../../core';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../core';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { DeleteExchangeCommand } from './delete-exchange.command';

@CommandHandler(DeleteExchangeCommand)
export class DeleteExchangeHandler implements ICommandHandler<DeleteExchangeCommand, void> {
  constructor(
    private readonly _repository: ShiftExchangesRepository,
    private readonly _prisma: PrismaService,
  ) {}

  async execute(command: DeleteExchangeCommand): Promise<void> {
    const exchange = await this._repository.getExchangeById(command.exchangeId);

    if (!exchange || exchange.shift.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND);
    }

    const member = await this._prisma.barMember.findUnique({
      where: {
        userId_barId: {
          userId: command.userId,
          barId: command.barId,
        },
      },
      select: { role: true, active: true },
    });

    if (!member || !member.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    // If the user is not an OWNER, enforce ownership of the exchange request and pending status
    if (member.role !== BarRole.OWNER) {
      if (exchange.requesterId !== command.userId) {
        throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
      }

      if (exchange.status !== ShiftExchangeStatus.PENDING) {
        throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
      }
    }

    await this._repository.deleteExchange(command.exchangeId);
  }
}
