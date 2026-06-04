import type { Shift } from '@coaster/common';
import { ErrorCodes } from '../../../core';
import { BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ShiftCreatedEvent } from '../../../events';
import { ShiftsRepository } from '../../data-access/shifts.repository';
import { ShiftsMapper } from '../../mappers/shifts.mapper';
import { CreateShiftCommand } from './create-shift.command';

@CommandHandler(CreateShiftCommand)
export class CreateShiftHandler implements ICommandHandler<CreateShiftCommand, void> {
  readonly #logger = new Logger(CreateShiftHandler.name);

  constructor(
    private readonly _shiftsRepository: ShiftsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateShiftCommand): Promise<void> {
    const isMember = await this._shiftsRepository.isUserMemberOfBar(command.dto.userId, command.barId);

    if (!isMember) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    const { startTime, endTime, userId, ...rest } = command.dto;

    const shiftStartTime = new Date(startTime);
    const shiftEndTime = new Date(endTime);

    if (isNaN(shiftStartTime.getTime()) || isNaN(shiftEndTime.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const created = await this._shiftsRepository.create(command.barId, userId, {
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      ...rest,
    });
    const mapped = ShiftsMapper.toDomain(created);
    this.#logger.debug(`Publishing ShiftCreatedEvent...`);
    this._eventBus.publish(new ShiftCreatedEvent(command.barId, mapped));
  }
}
