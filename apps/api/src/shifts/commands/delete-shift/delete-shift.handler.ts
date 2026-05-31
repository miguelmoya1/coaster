import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ShiftsRepository } from '../../data-access/shifts.repository';
import { DeleteShiftCommand } from './delete-shift.command';

@CommandHandler(DeleteShiftCommand)
export class DeleteShiftHandler implements ICommandHandler<DeleteShiftCommand, void> {
  constructor(private readonly _shiftsRepository: ShiftsRepository) {}

  async execute(command: DeleteShiftCommand): Promise<void> {
    const shift = await this._shiftsRepository.findById(command.shiftId);

    if (!shift || shift.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    await this._shiftsRepository.delete(command.shiftId);
  }
}
