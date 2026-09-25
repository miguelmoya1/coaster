import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CashClose, CashClosePreview } from '@coaster/common';
import { asCashCloseId, asEstablishmentId, asUserId, EstablishmentPermission } from '@coaster/common';
import { CashCloseStore } from '@coaster/cash-close';
import { MyMemberStore } from '@coaster/establishment-members';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { PrintTicket } from '@coaster/printer';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import CashClosePage from './cash-close';

const previewOf = (overrides: Partial<CashClosePreview> = {}): CashClosePreview => ({
  closedOrders: 12,
  cancelledOrders: 0,
  cancelledAmount: 0,
  cashAmount: 42050,
  cardAmount: 31000,
  tipAmount: 1200,
  since: '2026-09-23T08:00:00.000Z',
  openOrders: 0,
  openOrdersCharged: 0,
  openingFloat: 15000,
  ...overrides,
});

const cashClose: CashClose = {
  id: asCashCloseId('close-1'),
  establishmentId: asEstablishmentId('establishment-1'),
  closedById: asUserId('user-1'),
  closedByName: 'Lucía',
  since: null,
  closedAt: '2026-09-23T23:40:00.000Z',
  closedOrders: 12,
  cancelledOrders: 0,
  cancelledAmount: 0,
  cashAmount: 42050,
  cardAmount: 31000,
  tipAmount: 1200,
  openingFloat: 15000,
  countedCash: 56950,
  expectedCash: 57050,
  difference: -100,
  notes: null,
};

describe('CashClosePage', () => {
  let fixture: ComponentFixture<CashClosePage>;
  let component: CashClosePage;

  const preview = signal<CashClosePreview | undefined>(previewOf());
  const history = signal<CashClose[]>([cashClose]);
  const granted = new Set<EstablishmentPermission>();

  const storeMock = {
    preview: {
      value: preview,
      hasValue: () => preview() !== undefined,
      isLoading: () => false,
    },
    history: {
      value: history,
      hasValue: () => true,
      isLoading: () => false,
    },
    setEstablishmentId: vi.fn(),
    close: vi.fn().mockResolvedValue(cashClose),
  };
  const confirmationMock = { confirm: vi.fn().mockResolvedValue(true) };
  const printMock = { executeText: vi.fn().mockResolvedValue(undefined) };

  const render = async () => {
    fixture = TestBed.createComponent(CashClosePage);
    fixture.componentRef.setInput('establishmentId', asEstablishmentId('establishment-1'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const typeInto = (index: number, value: string) => {
    const input = fixture.nativeElement.querySelectorAll('input[type="number"]')[index] as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async () => {
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    preview.set(previewOf());
    history.set([cashClose]);
    granted.clear();
    granted.add(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS);

    await TestBed.configureTestingModule({
      imports: [CashClosePage],
      providers: [
        provideTranslateService(),
        { provide: CashCloseStore, useValue: storeMock },
        { provide: ConfirmationDialog, useValue: confirmationMock },
        { provide: PrintTicket, useValue: printMock },
        {
          provide: MyMemberStore,
          useValue: { hasPermission: (permission: EstablishmentPermission) => granted.has(permission) },
        },
        { provide: CurrentEstablishmentStore, useValue: { current: { value: () => ({ name: 'Bar Pepe' }) } } },
      ],
    }).compileComponents();
  });

  it('should point the store at the establishment on screen', async () => {
    await render();

    expect(storeMock.setEstablishmentId).toHaveBeenCalledWith('establishment-1');
  });

  it('should offer the float the last close left, and expect it plus what was taken in cash', async () => {
    await render();

    expect(component['form'].openingFloat().value()).toBe(150);
    expect(component['expectedCash']()).toBe(57050);
  });

  it('should work out the difference as the count is typed', async () => {
    await render();

    typeInto(1, '569.50');
    fixture.detectChanges();

    expect(component['difference']()).toBe(-100);
  });

  it('should warn that open orders stay out, and how much of them is already in the drawer', async () => {
    preview.set(previewOf({ openOrders: 2, openOrdersCharged: 550 }));
    await render();

    expect(text()).toContain('cash_close.open_orders_warning');
    expect(text()).toContain('cash_close.open_orders_charged');
  });

  it('should close in cents once confirmed', async () => {
    await render();
    typeInto(1, '569.50');
    fixture.detectChanges();

    await submit();

    expect(storeMock.close).toHaveBeenCalledWith('establishment-1', {
      openingFloat: 15000,
      countedCash: 56950,
      notes: undefined,
    });
  });

  it('should not close when the confirmation is turned down', async () => {
    confirmationMock.confirm.mockResolvedValueOnce(false);
    await render();

    await submit();

    expect(storeMock.close).not.toHaveBeenCalled();
  });

  it('should print a past close on the establishment printer', async () => {
    await render();

    await component['print'](cashClose);

    const [establishmentId, ticket] = printMock.executeText.mock.calls[0];
    expect(establishmentId).toBe('establishment-1');
    expect(ticket).toContain('Bar Pepe');
  });

  it('should keep past closes away from whoever cannot see the takings', async () => {
    granted.clear();
    await render();

    expect(text()).not.toContain('cash_close.history_title');
  });
});
