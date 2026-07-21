import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyMemberStore } from '@coaster/bars';
import { ActiveOrdersStore, OrderHistoryStore } from '@coaster/orders';
import { provideTranslateService } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import History from './history';

describe('History', () => {
  let component: History;
  let fixture: ComponentFixture<History>;

  const today = new Date().toISOString().split('T')[0];

  const orderHistoryStoreMock = {
    history: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    selectedDate: vi.fn().mockReturnValue(today),
    totalClosed: signal(0),
    totalCancelled: signal(0),
    historyTotalRevenue: signal(0),
    averageTicket: signal(0),
    setHistoryDate: vi.fn(),
    reloadHistory: vi.fn(),
    setBarId: vi.fn(),
  };

  const activeOrdersStoreMock = {
    deleteOrder: vi.fn(),
    setBarId: vi.fn(),
  };

  const myMemberStoreMock = {
    isOwner: signal(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideTranslateService(),
        provideNativeDateAdapter(),
        provideRouter([]),
        { provide: OrderHistoryStore, useValue: orderHistoryStoreMock },
        { provide: ActiveOrdersStore, useValue: activeOrdersStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(History);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('barId input', () => {
    it('should expose barId with provided value', () => {
      expect(component.barId()).toBe('bar-1');
    });
  });

  describe('rendering', () => {
    it('should render status cards', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('mat-card');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('computed properties', () => {
    it('should return empty orders view model when no orders', () => {
      expect(component['ordersViewModel']()).toEqual([]);
    });

    it('should return false for isOwner when no members loaded', () => {
      expect(component.isOwner()).toBe(false);
    });
  });

  describe('actions', () => {
    it('should call setHistoryDate on previous day navigation', () => {
      component.prevDay();
      expect(orderHistoryStoreMock.setHistoryDate).toHaveBeenCalled();
    });

    it('should call setHistoryDate on goToday', () => {
      component.goToday();
      expect(orderHistoryStoreMock.setHistoryDate).toHaveBeenCalledWith(today);
    });

    it('should call setHistoryDate on goYesterday', () => {
      component.goYesterday();
      expect(orderHistoryStoreMock.setHistoryDate).toHaveBeenCalled();
    });
  });
});
