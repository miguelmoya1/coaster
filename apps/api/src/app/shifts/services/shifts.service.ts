import {
  BarId,
  Shift as IShift,
  asBarId,
  asShiftId,
  asShiftType,
  asUserId,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Shift as ShiftDb } from '../../core';
import { ShiftsRepository } from '../data-access/shifts.repository';
import { CreateShiftDto } from '../dto/create-shift.dto';

type ShiftWithUser = ShiftDb & { user?: { id: string; name: string } };

@Injectable()
export class ShiftsService {
  constructor(private readonly _shiftsRepository: ShiftsRepository) {}

  async createShift(barId: BarId, dto: CreateShiftDto) {
    const isMember = await this._shiftsRepository.isUserMemberOfBar(
      dto.userId,
      barId,
    );

    if (!isMember) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    const shiftDate = new Date(dto.date);
    if (isNaN(shiftDate.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const shift = await this._shiftsRepository.create(
      barId,
      dto.userId,
      shiftDate,
      dto.type,
      dto.notes,
    );

    return this.#mapToDomain(shift);
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
    return shifts.map((shift) => this.#mapToDomain(shift));
  }

  #mapToDomain(dbShift: ShiftWithUser): IShift {
    return {
      id: asShiftId(dbShift.id),
      date: dbShift.date.toISOString().split('T')[0],
      type: asShiftType(dbShift.type),
      userId: asUserId(dbShift.userId),
      barId: asBarId(dbShift.barId),
      notes: dbShift.notes ?? undefined,
      user: dbShift.user
        ? {
            id: asUserId(dbShift.user.id),
            name: dbShift.user.name,
            email: '',
            active: true,
          }
        : undefined,
    };
  }
}
