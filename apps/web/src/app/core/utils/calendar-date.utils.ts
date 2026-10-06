const twoDigits = (value: number) => String(value).padStart(2, '0');

export const calendarDateOf = (date: Date): string =>
  `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;

export const todayCalendarDate = (): string => calendarDateOf(new Date());

export const dateOfCalendarDate = (calendarDate: string): Date => {
  const [year, month, day] = calendarDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const shiftCalendarDate = (calendarDate: string, days: number): string => {
  const date = dateOfCalendarDate(calendarDate);
  date.setDate(date.getDate() + days);
  return calendarDateOf(date);
};
