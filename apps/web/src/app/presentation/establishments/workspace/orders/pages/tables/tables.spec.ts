import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Order, Table } from '@coaster/common';
import { asEstablishmentId, asOrderId, asTableId, OrderStatus, TableStatus } from '@coaster/common';
import { MyMemberStore } from '@coaster/establishment-members';
import { ManageTables } from '@coaster/tables';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import Tables from './tables';

const establishmentId = asEstablishmentId('establishment-1');

const table = (id: string, status: TableStatus = TableStatus.FREE) =>
  ({ id: asTableId(id), establishmentId, name: `Mesa ${id}`, status }) as Table;

const order = (id: string, tableId: string | null, payableTotal: number) =>
  ({
    id: asOrderId(id),
    establishmentId,
    status: OrderStatus.OPEN,
    tableId: tableId ? asTableId(tableId) : null,
    payableTotal,
    items: [],
  }) as unknown as Order;

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  const manageTablesMock = { create: vi.fn(), delete: vi.fn().mockResolvedValue(undefined) };
  const confirmationMock = { confirm: vi.fn().mockResolvedValue(true) };

  const render = async (tables = fakeResource<Table[]>([]), orders = fakeResource<Order[]>([])) => {
    fixture = TestBed.createComponent(Tables);
    fixture.componentRef.setInput('establishmentId', establishmentId);
    fixture.componentRef.setInput('tables', tables.resource);
    fixture.componentRef.setInput('openOrders', orders.resource);
    component = fixture.componentInstance;
    await fixture.whenStable();
    return { tables, orders };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [Tables],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ManageTables, useValue: manageTablesMock },
        { provide: ConfirmationDialog, useValue: confirmationMock },
        { provide: MyMemberStore, useValue: { isOwner: signal(true) } },
      ],
    }).compileComponents();
  });

  it('should show progress while the tables are on their way, and no empty message yet', async () => {
    await render(fakeResource<Table[]>());

    expect(fixture.nativeElement.querySelector('coaster-loading')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('orders.no_tables');
  });

  it('should count free and occupied tables and open orders', async () => {
    await render(
      fakeResource([table('1'), table('2', TableStatus.OCCUPIED)]),
      fakeResource([order('a', '2', 1100), order('b', null, 500)]),
    );

    expect(component['counts']()).toMatchObject({ free: 1, occupied: 1 });
    expect(component['totalOpen']()).toBe(2);
  });

  it('should put what each table owes on its card, and bar orders apart', async () => {
    await render(fakeResource([table('1'), table('2')]), fakeResource([order('a', '2', 1100), order('b', null, 500)]));

    expect(component['tablesViewModel']().map((t) => t.orderAmount)).toEqual([undefined, 1100]);
    expect(component['barOrdersViewModel']().map((o) => o.id)).toEqual(['b']);
  });

  it('should delete a table after confirming, and bring the list up to date', async () => {
    const { tables } = await render(fakeResource([table('1')]));

    await component['handleDeleteTable'](table('1'));

    expect(manageTablesMock.delete).toHaveBeenCalledWith(establishmentId, '1');
    expect(tables.reload).toHaveBeenCalled();
  });
});
