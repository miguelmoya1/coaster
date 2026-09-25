import type { CashClose } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CashClosesWriteRepository } from '../../data-access/cash-closes.write.repository';
import { CashClosesMapper } from '../../mappers/cash-closes.mapper';
import { CloseCashCommand } from '../impl/close-cash.command';

@CommandHandler(CloseCashCommand)
export class CloseCashHandler implements ICommandHandler<CloseCashCommand, CashClose> {
  constructor(private readonly writeRepo: CashClosesWriteRepository) {}

  async execute(command: CloseCashCommand): Promise<CashClose> {
    const cashClose = await this.writeRepo.close(command.establishmentId, command.closedById, command.dto);
    return CashClosesMapper.toDomain(cashClose);
  }
}
