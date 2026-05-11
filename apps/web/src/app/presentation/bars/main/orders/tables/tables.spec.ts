import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';
import { BarOrders } from '../../../../../orders';
import { BarTables, CreateTable, DeleteTable } from '../../../../../tables';
import Tables from './tables';

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  const tablesMock = {
    all: { value: vi.fn().mockReturnValue([]), isLoading: vi.fn().mockReturnValue(false), hasValue: vi.fn().mockReturnValue(true) },
    freeCount: signal(2),
    occupiedCount: signal(1),
    reload: vi.fn(),
  };

  const ordersMock = {
    all: { value: vi.fn().mockReturnValue([]), isLoading: vi.fn().mockReturnValue(false), hasValue: vi.fn().mockReturnValue(true) },
    openOrders: vi.fn().mockReturnValue([]),
    totalOpen: signal(3),
    totalRevenue: signal(0),
    reload: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tables],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: BarTables, useValue: tablesMock },
        { provide: BarOrders, useValue: ordersMock },
        { provide: CreateTable, useValue: { create: vi.fn() } },
        { provide: DeleteTable, useValue: { delete: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: vi.fn().mockReturnValue({ id: 'u-1' }), hasValue: vi.fn().mockReturnValue(true) } } },
        { provide: BarMembers, useValue: { list: { value: vi.fn().mockReturnValue([]), hasValue: vi.fn().mockReturnValue(true), isLoading: vi.fn().mockReturnValue(false) } } },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(Tables);
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
      expect(cards.length).toBe(3);
    });

    it('should render tables title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('[coaster-title]');
      expect(title).toBeTruthy();
    });
  });

  describe('computed properties', () => {
    it('should return false for isOwner when no matching member', () => {
      expect(component.isOwner()).toBe(false);
    });

    it('should return empty tables view model when no tables', () => {
      expect(component['tablesViewModel']()).toEqual([]);
    });

    it('should return empty bar orders view model when no orders', () => {
      expect(component['barOrdersViewModel']()).toEqual([]);
    });
  });

  describe('actions', () => {
    it('should toggle showCreateTable signal', () => {
      expect(component.showCreateTable()).toBe(false);
      component.onCreateTable();
      expect(component.showCreateTable()).toBe(true);
    });
  });
});
