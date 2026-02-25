import { ShiftType } from './enums';
import { User } from './user.interface';

export interface Shift {
  id: string;
  date: string; // ISO String (YYYY-MM-DD)
  type: ShiftType;
  userId: string;
  user?: User;
  notes?: string;
}

export interface CreateShiftDto {
  date: string;
  type: ShiftType;
  userId: string;
  notes?: string;
}

export interface ShiftExchange {
  id: string;
  shiftId: string;
  requesterId: string;
  targetId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
