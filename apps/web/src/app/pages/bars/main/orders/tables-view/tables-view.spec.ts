import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import TablesView from './tables-view';
import { signal } from '@angular/core';
import { BarTables, CreateTable, DeleteTable } from '../../../../../tables';
import { BarOrders, ManageOrder } from '../../../../../orders';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';

describe('TablesView', () => {
  let component: TablesView;
  let fixture: ComponentFixture<TablesView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablesView, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarTables,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            freeCount: signal(0),
            occupiedCount: signal(0),
          },
        },
        {
          provide: BarOrders,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            openOrders: signal([]),
            totalOpen: signal(0),
            totalRevenue: signal(0),
          },
        },
        { provide: ManageOrder, useValue: { payItem: vi.fn(), deliverItem: vi.fn(), checkout: vi.fn(), cancel: vi.fn(), moveTable: vi.fn(), merge: vi.fn(), addItems: vi.fn() } },
        { provide: CreateTable, useValue: { create: vi.fn() } },
        { provide: DeleteTable, useValue: { delete: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TablesView);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
