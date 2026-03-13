import { Bar, BarId } from './bar.interface';
import { Brand } from './brand.type';
import { ShiftExchangeStatus, ShiftType } from './enums';
import { User, UserId } from './user.interface';

export type ShiftId = Brand<string, 'ShiftId'>;
export type ShiftExchangeId = Brand<string, 'ShiftExchangeId'>;

export const asShiftId = (id: string): ShiftId => id as ShiftId;
export const asShiftExchangeId = (id: string): ShiftExchangeId =>
  id as ShiftExchangeId;

export interface Shift {
  id: ShiftId;
  date: string; // ISO String (YYYY-MM-DD)
  type: ShiftType;
  userId: UserId;
  user?: User;
  barId: BarId;
  bar?: Bar;
  notes?: string;
}

export interface CreateShiftDto {
  date: string;
  type: ShiftType;
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
  status: ShiftExchangeStatus;
}
