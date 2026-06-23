import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { ShiftsReadRepository } from '../../data-access/shifts.read.repository';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { ShiftCreatedEvent } from '../../events';
import { ShiftsMapper } from '../../mappers/shifts.mapper';
import { CreateShiftCommand } from './create-shift.command';

@CommandHandler(CreateShiftCommand)
export class CreateShiftHandler implements ICommandHandler<CreateShiftCommand, void> {
  readonly #logger = new Logger(CreateShiftHandler.name);

  constructor(
    private readonly readRepo: ShiftsReadRepository,
    private readonly writeRepo: ShiftsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateShiftCommand): Promise<void> {
    const { startTime, endTime, userId, ...rest } = command.dto;

    if (!(startTime instanceof Temporal.Instant) || !(endTime instanceof Temporal.Instant)) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const created = await this.writeRepo.create(command.barId, userId, {
      startTime: new Date(startTime.epochMilliseconds),
      endTime: new Date(endTime.epochMilliseconds),
      ...rest,
    });
    const mapped = ShiftsMapper.toDomain(created);
    this.#logger.debug(`Publishing ShiftCreatedEvent...`);
    this._eventBus.publish(new ShiftCreatedEvent(command.barId, mapped));
  }
}
