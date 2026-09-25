import type { CashClose } from '@coaster/common';
import { asCashCloseId, asEstablishmentId, asUserId } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import type { CashCloseTicketText } from './cash-close-ticket';
import { cashCloseTicket } from './cash-close-ticket';

const cashClose: CashClose = {
  id: asCashCloseId('close-1'),
  establishmentId: asEstablishmentId('establishment-1'),
  closedById: asUserId('user-1'),
  closedByName: 'Lucía',
  since: '2026-09-23T08:00:00.000Z',
  closedAt: '2026-09-23T23:40:00.000Z',
  closedOrders: 42,
  cancelledOrders: 2,
  cancelledAmount: 2300,
  cashAmount: 142050,
  cardAmount: 31000,
  tipAmount: 1200,
  openingFloat: 15000,
  countedCash: 156950,
  expectedCash: 157050,
  difference: -100,
  notes: null,
};

const text: CashCloseTicketText = {
  title: 'CIERRE DE CAJA',
  establishmentName: 'Bar Pepe',
  closedAt: '23/09/2026 23:40',
  since: 'Desde 23/09/2026 08:00',
  closedBy: 'Cerró Lucía',
  closedOrders: 'Comandas cobradas',
  cancelledOrders: 'Anuladas',
  cash: 'Efectivo',
  card: 'Tarjeta',
  tips: 'Propinas (incluidas)',
  total: 'Total',
  openingFloat: 'Fondo de caja',
  expected: 'Esperado en caja',
  counted: 'Contado',
  difference: 'Diferencia',
  notes: 'Notas',
};

describe('cashCloseTicket', () => {
  const lines = cashCloseTicket(cashClose, text).split('\n');

  it('should fit every line on a 58 mm roll', () => {
    for (const line of lines) {
      expect(line.length, line).toBeLessThanOrEqual(32);
    }
  });

  it('should align amounts to the right edge, in euros without the symbol the printer cannot print', () => {
    expect(lines).toContain('Efectivo                1.420,50');
    expect(lines).toContain('Total                   1.730,50');
    expect(lines).toContain('Diferencia                 -1,00');
  });

  it('should show the cancelled orders with how many there were', () => {
    expect(lines).toContain(`Anuladas (2)${' '.repeat(15)}23,00`);
  });

  it('should leave the notes out when there are none, and add them when there are', () => {
    expect(lines.some((line) => line.startsWith('Notas'))).toBe(false);

    const withNotes = cashCloseTicket({ ...cashClose, notes: 'Faltan 1 € del cambio' }, text);
    expect(withNotes.endsWith('Notas: Faltan 1 € del cambio')).toBe(true);
  });

  it('should cut a label that does not fit rather than push the amount off the roll', () => {
    const long = cashCloseTicket(cashClose, { ...text, tips: 'Propinas incluidas en efectivo y tarjeta' });
    expect(long.split('\n').every((line) => line.length <= 32)).toBe(true);
  });
});
