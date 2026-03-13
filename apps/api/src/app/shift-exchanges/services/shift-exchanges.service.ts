import {
  BarId,
  ShiftExchangeId,
  ShiftExchangeStatus,
  ShiftId,
  UserId,
  asShiftId,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShiftExchangesRepository } from '../data-access/shift-exchanges.repository';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';

@Injectable()
export class ShiftExchangesService {
  constructor(
    private readonly _shiftExchangesRepository: ShiftExchangesRepository,
  ) {}

  async getPendingExchanges(barId: BarId) {
    // Optional: We can map to Domain here if needed, but returning raw objects
    // for MVP might be sufficient since we didn't specify a detailed mapped return type.
    return this._shiftExchangesRepository.findPendingByBarId(barId);
  }

  async requestExchange(
    barId: BarId,
    shiftId: ShiftId,
    requesterId: UserId,
    dto: CreateShiftExchangeDto,
  ) {
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

    return this._shiftExchangesRepository.createExchange(
      shiftId,
      requesterId,
      dto.targetId,
    );
  }

  async acceptExchange(
    barId: BarId,
    exchangeId: ShiftExchangeId,
    acceptingUserId: UserId,
  ) {
    const exchange =
      await this._shiftExchangesRepository.getExchangeById(exchangeId);

    if (!exchange) {
      throw new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND);
    }
    if (exchange.status !== ShiftExchangeStatus.PENDING) {
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

    const [updatedExchange] =
      await this._shiftExchangesRepository.acceptExchangeAndSwapShift(
        exchangeId,
        asShiftId(exchange.shiftId),
        acceptingUserId,
      );

    return updatedExchange;
  }
}
