import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import type { Order } from '@coaster/common';
import { asEstablishmentId, asOrderId, OrderStatus } from '@coaster/common';
import { MyMemberStore } from '@coaster/establishment-members';
import { ManageOrder, todayIso } from '@coaster/orders';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import History from './history';

const establishmentId = asEstablishmentId('establishment-1');

const order = (id: string, status: OrderStatus, orderTotal: number) =>
  ({ id: asOrderId(id), establishmentId, status, orderTotal, totalAmount: orderTotal, items: [] }) as unknown as Order;

describe('History', () => {
  let component: History;
  let fixture: ComponentFixture<History>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const manageOrderMock = { delete: vi.fn().mockResolvedValue(undefined) };
  const confirmationMock = { confirm: vi.fn().mockResolvedValue(true) };

  const render = async (history = fakeResource<Order[]>([]), date?: string) => {
    fixture = TestBed.createComponent(History);
    fixture.componentRef.setInput('establishmentId', establishmentId);
    fixture.componentRef.setInput('history', history.resource);
    fixture.componentRef.setInput('date', date);
    component = fixture.componentInstance;
    await fixture.whenStable();
    return history;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideTranslateService(),
        provideNativeDateAdapter(),
        provideRouter([]),
        { provide: ManageOrder, useValue: manageOrderMock },
        { provide: ConfirmationDialog, useValue: confirmationMock },
        { provide: MyMemberStore, useValue: { isOwner: signal(true) } },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should show today when the URL names no day', async () => {
    await render();

    expect(component['selectedDate']()).toBe(todayIso());
    expect(component.isToday()).toBe(true);
  });

  it('should show the day the URL names', async () => {
    await render(fakeResource<Order[]>([]), '2026-09-01');

    expect(component['selectedDate']()).toBe('2026-09-01');
    expect(component.isToday()).toBe(false);
  });

  it('should sum up what was taken that day', async () => {
    await render(
      fakeResource([
        order('a', OrderStatus.CLOSED, 1000),
        order('b', OrderStatus.CLOSED, 2000),
        order('c', OrderStatus.CANCELLED, 500),
      ]),
    );

    expect(component['summary']()).toEqual({ closed: 2, cancelled: 1, revenue: 3000, averageTicket: 1500 });
  });

  it('should move between days through the URL, leaving it clean for today', async () => {
    await render(fakeResource<Order[]>([]), '2026-09-10');

    component.prevDay();
    expect(navigate).toHaveBeenLastCalledWith(['/establishments', establishmentId, 'orders', 'history'], {
      queryParams: { date: '2026-09-09' },
    });

    component.goToday();
    expect(navigate).toHaveBeenLastCalledWith(['/establishments', establishmentId, 'orders', 'history'], {
      queryParams: { date: null },
    });
  });

  it('should not go past today', async () => {
    await render();

    component.nextDay();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should delete an order after confirming and bring the day up to date', async () => {
    const history = await render(fakeResource([order('a', OrderStatus.CLOSED, 1000)]));

    await component['handleDeleteOrder'](order('a', OrderStatus.CLOSED, 1000));

    expect(manageOrderMock.delete).toHaveBeenCalledWith(establishmentId, 'a');
    expect(history.reload).toHaveBeenCalled();
  });

  it('should show progress while the day is loading, not an empty day', async () => {
    await render(fakeResource<Order[]>());

    expect(fixture.nativeElement.querySelector('coaster-loading')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('history.no_orders');
  });
});
