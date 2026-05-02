import {
  asShiftExchangeId,
  asShiftId,
  asUserId,
  ShiftExchange as IShiftExchange,
  ShiftExchangeStatus,
} from '@coaster/common';

export interface ExchangeWithRelations {
  id: string;
  shiftId: string;
  requesterId: string;
  targetId: string | null;
  status: string;
  createdAt: Date;
  shift: { startTime: Date; endTime: Date };
  requester: { id: string; name: string };
}

export const ShiftExchangesMapper = {
  toDomain(exchange: ExchangeWithRelations): IShiftExchange {
    return {
      id: asShiftExchangeId(exchange.id),
      shiftId: asShiftId(exchange.shiftId),
      requesterId: asUserId(exchange.requesterId),
      targetId: exchange.targetId ? asUserId(exchange.targetId) : undefined,
      status: exchange.status as ShiftExchangeStatus,
      requesterName: exchange.requester.name,
      shiftStartTime: exchange.shift.startTime.toISOString(),
      shiftEndTime: exchange.shift.endTime.toISOString(),
      createdAt: exchange.createdAt,
    };
  },

  toDto(domainEntity: IShiftExchange): IShiftExchange {
    return domainEntity;
  },
};
