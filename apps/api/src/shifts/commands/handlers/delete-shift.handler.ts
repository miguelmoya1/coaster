import { ErrorCodes, asEstablishmentId, asShiftId } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ShiftsReadRepository } from '../../data-access/shifts.read.repository';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { ShiftDeletedEvent } from '../../events';
import { DeleteShiftCommand } from '../impl/delete-shift.command';

@CommandHandler(DeleteShiftCommand)
export class DeleteShiftHandler implements ICommandHandler<DeleteShiftCommand, void> {
  readonly #logger = new Logger(DeleteShiftHandler.name);

  constructor(
    private readonly readRepo: ShiftsReadRepository,
    private readonly writeRepo: ShiftsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteShiftCommand): Promise<void> {
    const shift = await this.readRepo.findById(command.shiftId);

    if (!shift || shift.establishmentId !== command.establishmentId) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    await this.writeRepo.delete(command.shiftId);
    this.#logger.debug(`Publishing ShiftDeletedEvent...`);
    this._eventBus.publish(new ShiftDeletedEvent(asEstablishmentId(shift.establishmentId), asShiftId(command.shiftId)));
  }
}
