import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';

export type ScheduleView = 'day' | 'week' | 'month';

export const SCHEDULE_VIEWS: readonly ScheduleView[] = ['day', 'week', 'month'];

const dayIdOf = (date: Date): string => format(date, 'yyyy-MM-dd');

export const scheduleDateOf = (date: string | undefined): Date => {
  const parsed = date ? new Date(date) : new Date();
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
