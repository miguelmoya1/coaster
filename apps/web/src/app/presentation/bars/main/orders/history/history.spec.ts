import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import History from './history';
import { signal } from '@angular/core';
import { BarOrderHistory, OrderRepository } from '../../../../../orders';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';

describe('History', () => {
  let component: History;
  let fixture: ComponentFixture<History>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [History, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarOrderHistory,
          useValue: {
            setBarContext: vi.fn(),
            setDate: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            selectedDate: signal(new Date().toISOString().split('T')[0]),
            totalClosed: signal(0),
            totalCancelled: signal(0),
            totalOrders: signal(0),
            totalRevenue: signal(0),
            averageTicket: signal(0),
            closedOrders: signal([]),
            cancelledOrders: signal([]),
          },
        },
        { provide: OrderRepository, useValue: { deleteOrder: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(History);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
