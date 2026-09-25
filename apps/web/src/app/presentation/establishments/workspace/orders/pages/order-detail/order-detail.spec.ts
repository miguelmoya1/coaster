import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Order, Table } from '@coaster/common';
import { asEstablishmentId, asOrderId, OrderStatus } from '@coaster/common';
import { ManageOrder } from '@coaster/orders';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderDetail from './order-detail';

const establishmentId = asEstablishmentId('establishment-1');

const order = (overrides: Partial<Order> = {}) =>
  ({
    id: asOrderId('order-1'),
    establishmentId,
    status: OrderStatus.OPEN,
    totalAmount: 1000,
    orderTotal: 1100,
    payableTotal: 1100,
    tipAmount: 0,
    amountPaidCash: 0,
    amountPaidCard: 0,
    notes: null,
    items: [],
    adjustments: [],
    ...overrides,
  }) as unknown as Order;

describe('OrderDetail', () => {
  let component: OrderDetail;
  let fixture: ComponentFixture<OrderDetail>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };
  const manageOrderMock = {
    updateTip: vi.fn().mockResolvedValue(undefined),
    updateNotes: vi.fn().mockResolvedValue(undefined),
    removeAdjustment: vi.fn().mockResolvedValue(undefined),
  };

  const render = async (current = fakeResource(order())) => {
    fixture = TestBed.createComponent(OrderDetail);
    fixture.componentRef.setInput('establishmentId', establishmentId);
    fixture.componentRef.setInput('orderId', 'order-1');
    fixture.componentRef.setInput('order', current.resource);
    fixture.componentRef.setInput('tables', fakeResource<Table[]>([]).resource);
    fixture.componentRef.setInput('openOrders', fakeResource<Order[]>([]).resource);
    component = fixture.componentInstance;
    await fixture.whenStable();
    return current;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: ManageOrder, useValue: manageOrderMock },
      ],
    }).compileComponents();
  });

  it('should show progress while the order is on its way, and not claim it is missing', async () => {
    await render(fakeResource<Order>());

    expect(fixture.nativeElement.querySelector('coaster-loading')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('orders.order_not_found');
  });

  it('should say the order is gone when it cannot be found', async () => {
    const missing = fakeResource<Order>();
    missing.fail(new Error('ORDER_NOT_FOUND'));
    await render(missing);

    expect(fixture.nativeElement.textContent).toContain('orders.order_not_found');
  });

  it('should only let an open order be worked on', async () => {
    const current = await render();
    expect(component.currentOrder()?.id).toBe('order-1');

    current.resolve(order({ status: OrderStatus.CLOSED }));
    await fixture.whenStable();

    expect(component.currentOrder()).toBeNull();
    expect(component.displayOrder()?.status).toBe(OrderStatus.CLOSED);
  });

  it('should show a new tip at once, and take it back if the server refuses it', async () => {
    await render();
    let refuse!: (error: Error) => void;
    manageOrderMock.updateTip.mockReturnValueOnce(new Promise((_, reject) => (refuse = reject)));

    const saving = component['handleUpdateTipResult'](200);
    expect(component.displayOrder()).toMatchObject({ tipAmount: 200, payableTotal: 1300 });

    refuse(new Error('ORDER_NOT_OPEN'));
    await saving;
    expect(component.displayOrder()).toMatchObject({ tipAmount: 0, payableTotal: 1100 });
  });

  it('should follow the order again as soon as the server sends it back', async () => {
    const current = await render();

    await component.onOrderNotesChanged('mesa exterior');
    expect(component.displayOrder()?.notes).toBe('mesa exterior');

    current.resolve(order({ notes: 'terraza' }));
    await fixture.whenStable();
    expect(component.displayOrder()?.notes).toBe('terraza');
  });

  it('should fetch the order again after a discount is removed', async () => {
    const current = await render();

    await component.onRemoveAdjustment('adjustment-1');

    expect(manageOrderMock.removeAdjustment).toHaveBeenCalledWith(establishmentId, 'order-1', 'adjustment-1');
    expect(current.reload).toHaveBeenCalled();
  });

  it('should go back to the tables', async () => {
    await render();

    await component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/establishments', establishmentId, 'orders', 'tables']);
  });
});
