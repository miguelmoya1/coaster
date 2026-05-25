import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateShiftCommand } from './create-shift.command';
import { ShiftsRepository } from '../../data-access/shifts.repository';
import { ShiftsMapper } from '../../mappers/shifts.mapper';
import { Shift, ErrorCodes } from '@coaster/common';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

@CommandHandler(CreateShiftCommand)
export class CreateShiftHandler implements ICommandHandler<CreateShiftCommand, Shift> {
  constructor(private readonly _shiftsRepository: ShiftsRepository) {}

  async execute(command: CreateShiftCommand): Promise<Shift> {
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

    const shift = await this._shiftsRepository.create(command.barId, userId, {
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      ...rest,
    });

    return ShiftsMapper.toDomain(shift);
  }
}
