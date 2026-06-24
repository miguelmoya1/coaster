import { ShiftExchangeStatus } from '../constants/shift-exchange-status.type';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type ShiftId = Brand<string, 'ShiftId'>;
export type ShiftExchangeId = Brand<string, 'ShiftExchangeId'>;

export interface Shift {
  id: ShiftId;
  startTime: string; // ISO String
  endTime: string; // ISO String
  userId: UserId;
  userName: string;
  userImage?: string;
  barId: BarId;
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
