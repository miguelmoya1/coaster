import { ShiftExchangeStatus } from '../constants/shift-exchange-status.type';
import { EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

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
