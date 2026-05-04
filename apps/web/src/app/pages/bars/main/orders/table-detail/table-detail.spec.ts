import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import TableDetail from './table-detail';
import { signal } from '@angular/core';
import { BarTables } from '../../../../../tables';
import { BarOrders, ManageOrder } from '../../../../../orders';

describe('TableDetail', () => {
  let component: TableDetail;
  let fixture: ComponentFixture<TableDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableDetail, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarTables,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
          },
        },
        {
          provide: BarOrders,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            openOrders: signal([]),
          },
        },
        {
          provide: ManageOrder,
          useValue: {
            payItem: vi.fn(),
            deliverItem: vi.fn(),
            checkout: vi.fn(),
            cancel: vi.fn(),
            moveTable: vi.fn(),
            merge: vi.fn(),
            addItems: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableDetail);
    fixture.componentRef.setInput('barId', 'bar-1');
    fixture.componentRef.setInput('tableId', 'table-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
