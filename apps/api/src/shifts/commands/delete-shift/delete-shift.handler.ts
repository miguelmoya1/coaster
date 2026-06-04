import { asBarId, asShiftId, ErrorCodes } from '../../../core';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ShiftDeletedEvent } from '../../../events';
import { ShiftsRepository } from '../../data-access/shifts.repository';
import { DeleteShiftCommand } from './delete-shift.command';

@CommandHandler(DeleteShiftCommand)
export class DeleteShiftHandler implements ICommandHandler<DeleteShiftCommand, void> {
  readonly #logger = new Logger(DeleteShiftHandler.name);

  constructor(
    private readonly _shiftsRepository: ShiftsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteShiftCommand): Promise<void> {
    const shift = await this._shiftsRepository.findById(command.shiftId);

    if (!shift || shift.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    await this._shiftsRepository.delete(command.shiftId);
    this.#logger.debug(`Publishing ShiftDeletedEvent...`);
    this._eventBus.publish(new ShiftDeletedEvent(asBarId(shift.barId), asShiftId(command.shiftId)));
  }
}
