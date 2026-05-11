import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';
import { BarOrderHistory, OrderRepository } from '../../../../../orders';
import History from './history';

describe('History', () => {
  let component: History;
  let fixture: ComponentFixture<History>;

  const today = new Date().toISOString().split('T')[0];

  const historyMock = {
    all: { value: vi.fn().mockReturnValue([]), isLoading: vi.fn().mockReturnValue(false), hasValue: vi.fn().mockReturnValue(true) },
    selectedDate: vi.fn().mockReturnValue(today),
    totalClosed: signal(0),
    totalCancelled: signal(0),
    totalRevenue: signal(0),
    averageTicket: signal(0),
    setDate: vi.fn(),
    reload: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: BarOrderHistory, useValue: historyMock },
        { provide: OrderRepository, useValue: { deleteOrder: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: vi.fn().mockReturnValue(null), hasValue: vi.fn().mockReturnValue(false) } } },
        { provide: BarMembers, useValue: { list: { value: vi.fn().mockReturnValue([]), hasValue: vi.fn().mockReturnValue(false) } } },
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
      const cards = fixture.nativeElement.querySelectorAll('coaster-status-card');
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
    it('should call setDate on previous day navigation', () => {
      component.prevDay();
      expect(historyMock.setDate).toHaveBeenCalled();
    });

    it('should call setDate on goToday', () => {
      component.goToday();
      expect(historyMock.setDate).toHaveBeenCalledWith(today);
    });

    it('should call setDate on goYesterday', () => {
      component.goYesterday();
      expect(historyMock.setDate).toHaveBeenCalled();
    });
  });
});
