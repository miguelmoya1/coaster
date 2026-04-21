import { BarId } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ShiftsRepository } from '../data-access/shifts.repository';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsMapper } from '../mappers/shifts.mapper';

@Injectable()
export class ShiftsService {
  constructor(private readonly _shiftsRepository: ShiftsRepository) {}

  async createShift(barId: BarId, dto: CreateShiftDto) {
    const isMember = await this._shiftsRepository.isUserMemberOfBar(dto.userId, barId);

    if (!isMember) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    const { startTime, endTime, userId, ...rest } = dto;

    const shiftStartTime = new Date(startTime);
    const shiftEndTime = new Date(endTime);

    if (isNaN(shiftStartTime.getTime()) || isNaN(shiftEndTime.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const shift = await this._shiftsRepository.create(barId, userId, {
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      ...rest,
    });

    return ShiftsMapper.toDomain(shift);
  }

  async getShifts(barId: BarId, startDateIso?: string, endDateIso?: string) {
    const start = startDateIso ? new Date(startDateIso) : undefined;
    const end = endDateIso ? new Date(endDateIso) : undefined;

    if (start && isNaN(start.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    if (end && isNaN(end.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const shifts = await this._shiftsRepository.findByBarId(barId, start, end);
    return shifts.map((shift) => ShiftsMapper.toDomain(shift));
  }
}
