import { BarId, ErrorCodes, ShiftExchangeId, ShiftExchangeStatus, ShiftId, UserId, asShiftId } from '@coaster/common';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ShiftExchangesRepository } from '../data-access/shift-exchanges.repository';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper } from '../mappers/shift-exchanges.mapper';

@Injectable()
export class ShiftExchangesService {
  constructor(private readonly _shiftExchangesRepository: ShiftExchangesRepository) {}

  async getPendingExchanges(barId: BarId) {
    const exchanges = await this._shiftExchangesRepository.findPendingByBarId(barId);
    return exchanges.map((e) => ShiftExchangesMapper.toDomain(e));
  }

  async requestExchange(barId: BarId, shiftId: ShiftId, requesterId: UserId, dto: CreateShiftExchangeDto) {
    const shift = await this._shiftExchangesRepository.getShiftById(shiftId);

    if (!shift) {
      throw new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND);
    }

    if (shift.barId !== barId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (shift.userId !== requesterId) {
      throw new ForbiddenException(ErrorCodes.NOT_YOUR_SHIFT);
    }

    const hasPending = await this._shiftExchangesRepository.hasPendingExchangeForShift(shiftId);
    if (hasPending) {
      throw new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_PENDING);
    }

    return this._shiftExchangesRepository.createExchange(shiftId, requesterId, dto.targetId);
  }

  async acceptExchange(barId: BarId, exchangeId: ShiftExchangeId, acceptingUserId: UserId) {
    const exchange = await this._shiftExchangesRepository.getExchangeById(exchangeId);

    if (!exchange) {
      throw new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND);
    }

    if (exchange.status !== (ShiftExchangeStatus.PENDING as string)) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }

    if (exchange.shift.barId !== barId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    if (exchange.requesterId === acceptingUserId) {
      throw new BadRequestException(ErrorCodes.INVALID_EXCHANGE);
    }

    if (exchange.targetId && exchange.targetId !== acceptingUserId) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    }

    const [updatedExchange] = await this._shiftExchangesRepository.acceptExchangeAndSwapShift(
      exchangeId,
      asShiftId(exchange.shiftId),
      acceptingUserId,
    );

    return updatedExchange;
  }
}
