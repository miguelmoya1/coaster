import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import NewOrder from './new-order';
import { signal } from '@angular/core';
import { BarCategories } from '../../../../../categories';
import { BarProducts } from '../../../../../products';
import { BarOrders, CreateOrder, ManageOrder } from '../../../../../orders';
import { BarTables } from '../../../../../tables';

describe('NewOrder', () => {
  let component: NewOrder;
  let fixture: ComponentFixture<NewOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewOrder, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarProducts,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
          },
        },
        {
          provide: BarCategories,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
          },
        },
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
          },
        },
        { provide: CreateOrder, useValue: { create: vi.fn() } },
        { provide: ManageOrder, useValue: { addItems: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewOrder);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
