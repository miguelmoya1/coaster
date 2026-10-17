import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { calendarDateOf, dateOfCalendarDate } from '@coaster/core';

export type ScheduleView = 'day' | 'week' | 'month';

export const SCHEDULE_VIEWS: readonly ScheduleView[] = ['day', 'week', 'month'];

const dayIdOf = (date: Date): string => calendarDateOf(date);

export const scheduleDateOf = (date: string | undefined): Date => {
  if (!date) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return dateOfCalendarDate(date);
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const scheduleViewOf = (view: string | undefined): ScheduleView =>
  SCHEDULE_VIEWS.find((known) => known === view) ?? 'day';

export const shiftsRangeOf = (selected: Date, view: ScheduleView): { startIso: string; endIso: string } => {
  const start = view === 'month' ? startOfMonth(selected) : startOfWeek(selected, { weekStartsOn: 1 });
  const end = view === 'month' ? endOfMonth(selected) : endOfWeek(selected, { weekStartsOn: 1 });

  const startLocal = new Date(start);
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(end);
  endLocal.setHours(23, 59, 59, 999);

  return { startIso: startLocal.toISOString(), endIso: endLocal.toISOString() };
};

export const dayRangeOf = (day: Date): { startIso: string; endIso: string } => {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

export const timeSheetRangeOf = (selected: Date, view: ScheduleView): { from: string; to: string } => {
  if (view === 'day') {
    const day = dayIdOf(selected);
    return { from: day, to: day };
  }

  const start = view === 'month' ? startOfMonth(selected) : startOfWeek(selected, { weekStartsOn: 1 });
  const end = view === 'month' ? endOfMonth(selected) : endOfWeek(selected, { weekStartsOn: 1 });

  return { from: dayIdOf(start), to: dayIdOf(end) };
};
