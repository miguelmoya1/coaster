import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { ActiveOrdersStore } from '@coaster/orders';
import { TablesStore } from '@coaster/tables';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tables from './tables';

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  const activeOrdersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    openOrders: vi.fn().mockReturnValue([]),
    totalOpen: signal(3),
    totalRevenue: signal(0),
    reloadOrders: vi.fn(),
    setEstablishmentId: vi.fn(),
  };

  const tablesStoreMock = {
    tables: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    freeCount: signal(0),
    occupiedCount: signal(0),
    setEstablishmentId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };

  const myMemberStoreMock = {
    isOwner: signal(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tables],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ActiveOrdersStore, useValue: activeOrdersStoreMock },
        { provide: TablesStore, useValue: tablesStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(Tables);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('establishmentId input', () => {
    it('should expose establishmentId with provided value', () => {
      expect(component.establishmentId()).toBe('establishment-1');
    });
  });

  describe('rendering', () => {
    it('should render status cards', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('.grid mat-card');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('should render tables title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.heading-2');
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

    it('should return empty establishment orders view model when no orders', () => {
      expect(component['barOrdersViewModel']()).toEqual([]);
    });
  });
});
