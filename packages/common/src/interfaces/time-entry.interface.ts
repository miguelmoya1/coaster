import {
  ClockState,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  WorkdayDiscrepancy,
} from '../constants/time-entry.type';
import { EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';
import { ShiftId } from './shift.interface';
import { UserId } from './user.interface';

export type TimeEntryId = Brand<string, 'TimeEntryId'>;

export interface TimeEntryRevision {
  id: TimeEntryId;
  action: TimeEntryAction;
  type: TimeEntryType;
  occurredAt: string;
  recordedAt: string;
  source: TimeEntrySource;
  actorId: UserId;
  actorName: string | null;
  reason: string | null;
  hash: string;
}

export interface TimeEntry {
  id: TimeEntryId;
  rootId: TimeEntryId;
  establishmentId: EstablishmentId;
  userId: UserId;
  userName: string;
  type: TimeEntryType;
  occurredAt: string;
  recordedAt: string;
  workdayDate: string;
  source: TimeEntrySource;
  amended: boolean;
  voided: boolean;
  latitude?: number;
  longitude?: number;
  shiftId?: ShiftId;
  revisions: TimeEntryRevision[];
}

export interface Workday {
  date: string;
  userId: UserId;
  userName: string;
  state: ClockState;
  workedMinutes: number;
  breakMinutes: number;
  plannedMinutes: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  discrepancies: WorkdayDiscrepancy[];
  entries: TimeEntry[];
}

export interface ClockDto {
  type: TimeEntryType;
  latitude?: number;
  longitude?: number;
}

export interface CreateTimeEntryDto {
  userId: UserId;
  type: TimeEntryType;
  occurredAt: string;
  reason: string;
}

export interface AmendTimeEntryDto {
  occurredAt: string;
  reason: string;
}

export interface VoidTimeEntryDto {
  reason: string;
}

export interface TimeSheetQuery {
  userId?: UserId;
  from?: string;
  to?: string;
}

export interface TimeSheetIntegrity {
  establishmentId: EstablishmentId;
  checkedEntries: number;
  valid: boolean;
  brokenAt: TimeEntryId | null;
}
