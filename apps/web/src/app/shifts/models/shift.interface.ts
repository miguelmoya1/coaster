import type { EstablishmentId, Brand, UserId } from '@coaster/core';
import { ShiftExchangeStatus } from './shift-exchange-status.type';

export type ShiftId = Brand<string, 'ShiftId'>;
export type ShiftExchangeId = Brand<string, 'ShiftExchangeId'>;

export interface Shift {
  id: ShiftId;
  startTime: string;
  endTime: string;
  userId: UserId;
  userName: string;
  userImage?: string;
  establishmentId: EstablishmentId;
  notes?: string;
}

export interface CreateShiftDto {
  startTime: string;
  endTime: string;
  userId: UserId;
  notes?: string;
}

export interface CreateShiftExchangeDto {
  targetId?: UserId;
}

export interface ShiftExchange {
  id: ShiftExchangeId;
  shiftId: ShiftId;
  requesterId: UserId;
  targetId?: UserId;
  createdAt: string;
  status: ShiftExchangeStatus;
  requesterName: string;
  shiftStartTime: string;
  shiftEndTime: string;
}

export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId => id as ShiftExchangeId;
