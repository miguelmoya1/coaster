import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { ShiftExchangeStatus } from './enums';
import { UserId } from './user.interface';

export type ShiftId = Brand<string, 'ShiftId'>;
export type ShiftExchangeId = Brand<string, 'ShiftExchangeId'>;

export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId => id as ShiftExchangeId;

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
  createdAt: Date;
  status: ShiftExchangeStatus;
  requesterName: string;
  shiftStartTime: string;
  shiftEndTime: string;
}
