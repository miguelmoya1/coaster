import type { ShiftExchange as IShiftExchange, ShiftExchangeStatus } from '@coaster/common';
import { asShiftExchangeId, asShiftId, asUserId } from '../../core';

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
      shiftStartTime: Temporal.Instant.fromEpochMilliseconds(exchange.shift.startTime.getTime()).toString(),
      shiftEndTime: Temporal.Instant.fromEpochMilliseconds(exchange.shift.endTime.getTime()).toString(),
      createdAt: Temporal.Instant.fromEpochMilliseconds(exchange.createdAt.getTime()).toString(),
    };
  },

  toDto(domainEntity: IShiftExchange): IShiftExchange {
    return domainEntity;
  },
};
