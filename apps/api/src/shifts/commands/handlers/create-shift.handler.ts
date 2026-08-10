import { ErrorCodes } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { ShiftCreatedEvent } from '../../events';
import { ShiftsMapper } from '../../mappers/shifts.mapper';
import { CreateShiftCommand } from '../impl/create-shift.command';

@CommandHandler(CreateShiftCommand)
export class CreateShiftHandler implements ICommandHandler<CreateShiftCommand, void> {
  readonly #logger = new Logger(CreateShiftHandler.name);

  constructor(
    private readonly security: SecurityRepository,
    private readonly writeRepo: ShiftsWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateShiftCommand): Promise<void> {
    const { startTime, endTime, userId, ...rest } = command.dto;

    if (!(startTime instanceof Temporal.Instant) || !(endTime instanceof Temporal.Instant)) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    if (Temporal.Instant.compare(endTime, startTime) <= 0) {
      throw new BadRequestException(ErrorCodes.INVALID_SHIFT_RANGE);
    }

    const membership = await this.security.getEstablishmentMemberRole(userId, command.establishmentId);

    if (!membership?.active) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    const created = await this.writeRepo.create(command.establishmentId, userId, {
      startTime: new Date(startTime.epochMilliseconds),
      endTime: new Date(endTime.epochMilliseconds),
      ...rest,
    });
    const mapped = ShiftsMapper.toDomain(created);
    this.#logger.debug(`Publishing ShiftCreatedEvent...`);
    this._eventBus.publish(new ShiftCreatedEvent(command.establishmentId, mapped));
  }
}
