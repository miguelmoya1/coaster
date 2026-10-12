import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ActionFeedback, asEstablishmentId, asUserId, todayCalendarDate } from '@coaster/core';
import { asCashCloseId, ManageCashCloses, type CashClose, type CashClosePreview } from '@coaster/cash-close';
import { fakeResource } from '@coaster/testing';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { PrintTicket } from '@coaster/printer';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { DayPicker } from '../../../../../components/day-picker/day-picker';
import CashClosePage from './cash-close';

const previewOf = (overrides: Partial<CashClosePreview> = {}): CashClosePreview => ({
  closedOrders: 12,
  cancelledOrders: 0,
  cancelledAmount: 0,
  cashAmount: 42050,
  cardAmount: 31000,
  tipAmount: 1200,
  since: '2026-09-23T23:40:00.000Z',
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
  voidedAt: null,
  voidedById: null,
  voidedByName: null,
};

const olderClose: CashClose = {
  ...cashClose,
  id: asCashCloseId('close-0'),
  closedAt: '2026-09-22T23:40:00.000Z',
};

const voidedClose: CashClose = {
  ...cashClose,
  id: asCashCloseId('close-2'),
  closedAt: '2026-09-24T23:40:00.000Z',
  voidedAt: '2026-09-25T08:00:00.000Z',
  voidedById: asUserId('user-2'),
  voidedByName: 'Pablo',
};

describe('CashClosePage', () => {
  let fixture: ComponentFixture<CashClosePage>;
  let component: CashClosePage;
  let navigate: ReturnType<typeof vi.spyOn>;

  let preview = fakeResource(previewOf());
  let history = fakeResource<CashClose[]>([cashClose]);
  const manageMock = {
    close: vi.fn().mockResolvedValue(cashClose),
    void: vi.fn().mockResolvedValue(cashClose),
  };
  const feedbackMock = { success: vi.fn(), error: vi.fn() };
  const confirmationMock = { confirm: vi.fn().mockResolvedValue(true) };
  const printMock = { executeText: vi.fn().mockResolvedValue(undefined) };

  const render = async (date?: string) => {
    fixture = TestBed.createComponent(CashClosePage);
    fixture.componentRef.setInput('establishmentId', asEstablishmentId('establishment-1'));
    fixture.componentRef.setInput('preview', preview.resource);
    fixture.componentRef.setInput('history', history.resource);
    fixture.componentRef.setInput('date', date);
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
    preview = fakeResource(previewOf());
    history = fakeResource<CashClose[]>([cashClose]);

    await TestBed.configureTestingModule({
      imports: [CashClosePage],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ManageCashCloses, useValue: manageMock },
        { provide: ConfirmationDialog, useValue: confirmationMock },
        { provide: PrintTicket, useValue: printMock },
        { provide: ActionFeedback, useValue: feedbackMock },
        { provide: CurrentEstablishmentStore, useValue: { current: { value: () => ({ name: 'Bar Pepe' }) } } },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  const cashClosePage = ['/establishments', 'establishment-1', 'orders', 'cash-close'];

  it('should show progress while the till is being added up', async () => {
    preview = fakeResource<CashClosePreview>();
    await render();

    expect(fixture.nativeElement.querySelector('coaster-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
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
    preview = fakeResource(previewOf({ openOrders: 2, openOrdersCharged: 550 }));
    await render();

    expect(text()).toContain('cash_close.open_orders_warning');
    expect(text()).toContain('cash_close.open_orders_charged');
  });

  it('should close in cents once confirmed', async () => {
    await render();
    typeInto(1, '569.50');
    fixture.detectChanges();

    await submit();

    expect(manageMock.close).toHaveBeenCalledWith('establishment-1', {
      openingFloat: 15000,
      countedCash: 56950,
      notes: undefined,
    });
    expect(preview.reload).toHaveBeenCalled();
    expect(history.reload).toHaveBeenCalled();
  });

  it('should show today once the till is closed, where the new close is', async () => {
    await render('2026-09-01');

    await submit();

    expect(navigate).toHaveBeenLastCalledWith(cashClosePage, { queryParams: { date: null } });
  });

  it('should not close when the confirmation is turned down', async () => {
    confirmationMock.confirm.mockResolvedValueOnce(false);
    await render();

    await submit();

    expect(manageMock.close).not.toHaveBeenCalled();
  });

  it('should print a past close on the establishment printer', async () => {
    await render();

    await component['print'](cashClose);

    const [establishmentId, ticket] = printMock.executeText.mock.calls[0];
    expect(establishmentId).toBe('establishment-1');
    expect(ticket).toContain('Bar Pepe');
  });

  const cards = () => [...fixture.nativeElement.querySelectorAll('[data-testid="cash-close"]')] as HTMLElement[];
  const undoButtons = () =>
    [...fixture.nativeElement.querySelectorAll('[data-testid="undo-cash-close-btn"]')] as HTMLButtonElement[];

  it('should move between days through the URL, leaving it clean for today', async () => {
    await render();
    const pickDay = (date: string) =>
      fixture.debugElement.query(By.directive(DayPicker)).componentInstance.dateChange.emit(date);

    pickDay('2026-09-22');
    expect(navigate).toHaveBeenLastCalledWith(cashClosePage, { queryParams: { date: '2026-09-22' } });

    pickDay(todayCalendarDate());
    expect(navigate).toHaveBeenLastCalledWith(cashClosePage, { queryParams: { date: null } });
  });

  it('should say when the till was not closed that day', async () => {
    history = fakeResource<CashClose[]>([]);
    await render('2026-09-01');

    expect(text()).toContain('cash_close.no_history');
  });

  it('should not offer to undo a close of another day that is no longer the last', async () => {
    history = fakeResource<CashClose[]>([olderClose]);
    await render('2026-09-22');

    expect(undoButtons()).toHaveLength(0);
  });

  it('should offer to undo only the last close that still counts', async () => {
    history = fakeResource<CashClose[]>([voidedClose, cashClose, olderClose]);
    await render();

    expect(undoButtons()).toHaveLength(1);
    expect(cards().findIndex((card) => card.contains(undoButtons()[0]))).toBe(1);
  });

  it('should keep a voided close in the history, saying who undid it', async () => {
    history = fakeResource<CashClose[]>([voidedClose, cashClose]);
    await render();

    const voided = cards()[0];
    expect(voided.textContent).toContain('cash_close.voided_by');
    expect(voided.querySelector('button')).toBeNull();
  });

  it('should undo the close once confirmed, and add up the till again', async () => {
    await render();

    undoButtons()[0].click();
    await fixture.whenStable();

    expect(manageMock.void).toHaveBeenCalledWith('establishment-1', 'close-1');
    expect(preview.reload).toHaveBeenCalled();
    expect(history.reload).toHaveBeenCalled();
    expect(feedbackMock.success).toHaveBeenCalled();
  });

  it('should not undo when the confirmation is turned down', async () => {
    confirmationMock.confirm.mockResolvedValueOnce(false);
    await render();

    undoButtons()[0].click();
    await fixture.whenStable();

    expect(manageMock.void).not.toHaveBeenCalled();
  });

  it('should tell why the close could not be undone', async () => {
    const notLast = new Error('CASH_CLOSE_NOT_LAST');
    manageMock.void.mockRejectedValueOnce(notLast);
    await render();

    undoButtons()[0].click();
    await fixture.whenStable();

    expect(feedbackMock.error).toHaveBeenCalledWith(notLast);
    expect(history.reload).not.toHaveBeenCalled();
  });
});
