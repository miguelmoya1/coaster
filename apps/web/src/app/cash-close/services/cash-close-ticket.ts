import type { CashClose } from '@coaster/common';

const WIDTH = 32;

export interface CashCloseTicketText {
  title: string;
  establishmentName: string;
  closedAt: string;
  since: string;
  closedBy: string;
  closedOrders: string;
  cancelledOrders: string;
  cash: string;
  card: string;
  tips: string;
  total: string;
  openingFloat: string;
  expected: string;
  counted: string;
  difference: string;
  notes: string;
}

const amount = (cents: number) => {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const units = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${units},${String(absolute % 100).padStart(2, '0')}`;
};

const row = (label: string, value: string) => {
  const room = WIDTH - value.length - 1;
  const fitted = label.length > room ? label.slice(0, room) : label;
  return `${fitted}${' '.repeat(WIDTH - fitted.length - value.length)}${value}`;
};

const rule = '-'.repeat(WIDTH);

export const cashCloseTicket = (cashClose: CashClose, text: CashCloseTicketText): string =>
  [
    text.title,
    text.establishmentName,
    text.closedAt,
    text.since,
    text.closedBy,
    rule,
    row(text.closedOrders, String(cashClose.closedOrders)),
    row(`${text.cancelledOrders} (${cashClose.cancelledOrders})`, amount(cashClose.cancelledAmount)),
    rule,
    row(text.cash, amount(cashClose.cashAmount)),
    row(text.card, amount(cashClose.cardAmount)),
    row(text.tips, amount(cashClose.tipAmount)),
    row(text.total, amount(cashClose.cashAmount + cashClose.cardAmount)),
    rule,
    row(text.openingFloat, amount(cashClose.openingFloat)),
    row(text.expected, amount(cashClose.expectedCash)),
    row(text.counted, amount(cashClose.countedCash)),
    row(text.difference, amount(cashClose.difference)),
    ...(cashClose.notes ? [rule, `${text.notes}: ${cashClose.notes}`] : []),
  ].join('\n');
