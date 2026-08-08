import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MyMemberStore } from '@coaster/bar-members';
import { ClockState } from '@coaster/common';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { ExchangesStore } from '@coaster/exchanges';
import { MembersStore } from '@coaster/bar-members';
import { ShiftsStore } from '@coaster/shifts';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import Roster from './roster';

describe('Roster', () => {
  let component: Roster;
  let fixture: ComponentFixture<Roster>;

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
  };

  const shiftsStoreMock = {
    shifts: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    setDateRange: vi.fn(),
    reload: vi.fn(),
  };

  const myMemberStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue(undefined),
      hasValue: vi.fn().mockReturnValue(true),
    },
    hasPermission: vi.fn().mockReturnValue(false),
  };

  const timeTrackingStoreMock = {
    myWorkday: vi.fn().mockReturnValue(undefined),
    clockState: vi.fn().mockReturnValue(ClockState.OUT),
    teamWorkdays: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    setRange: vi.fn(),
    setTeamEnabled: vi.fn(),
    clock: vi.fn(),
    exportCsv: vi.fn(),
    verifyIntegrity: vi.fn(),
  };

  const exchangesMock = {
    exchanges: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    accept: vi.fn(),
    request: vi.fn(),
    reload: vi.fn(),
  };

  const confirmationDialogMock = {
    confirm: vi.fn(),
  };

  const bottomSheetMock = {
    open: vi.fn().mockReturnValue({ dismiss: vi.fn() }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roster],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: ShiftsStore, useValue: shiftsStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: ExchangesStore, useValue: exchangesMock },
        { provide: ConfirmationDialog, useValue: confirmationDialogMock },
        { provide: TimeTrackingStore, useValue: timeTrackingStoreMock },
        { provide: MatBottomSheet, useValue: bottomSheetMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Roster);
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
    it('should render the title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.heading-2');
      expect(title).toBeTruthy();
    });

    it('should render the navigation header', () => {
      fixture.detectChanges();
      const nav = fixture.nativeElement.querySelector('coaster-roster-navigation');
      expect(nav).toBeTruthy();
    });

    it('should render daily assignments heading', () => {
      fixture.detectChanges();
      const headings = fixture.nativeElement.querySelectorAll('.heading-2');
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('computed properties', () => {
    it('should return empty daily shifts when no shifts', () => {
      expect(component.dailyShifts()).toEqual([]);
    });

    it('should return empty pending exchanges list when no exchanges', () => {
      expect(component.pendingExchangesList()).toEqual([]);
    });

    it('should return undefined currentUserRole when no matching member', () => {
      expect(component.currentUserRole()).toBeUndefined();
    });

    it('should return empty pending shift ids set', () => {
      expect(component.pendingShiftIds().size).toBe(0);
    });
  });

  describe('time tracking sheets', () => {
    it('should open the correction sheets with the page injector so the timepicker finds its date adapter', () => {
      const entry = { id: 'entry-1', workdayDate: '2026-08-08' };

      (component as any).handleCreateEntry();
      (component as any).handleAmendEntry(entry);
      (component as any).handleVoidEntry(entry);

      expect(bottomSheetMock.open).toHaveBeenCalledTimes(3);

      for (const [, config] of bottomSheetMock.open.mock.calls) {
        expect(config.injector).toBeTruthy();
      }
    });
  });

  describe('interaction logic', () => {
    it('should handle handleNext correctly', () => {
      const updateSpy = vi.spyOn(component as any, 'updateQueryParams');
      (component as any).handleNext();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle handlePrev correctly', () => {
      const updateSpy = vi.spyOn(component as any, 'updateQueryParams');
      (component as any).handlePrev();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle handleToday correctly', () => {
      const updateSpy = vi.spyOn(component as any, 'updateQueryParams');
      (component as any).handleToday();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should delete a shift after confirmation', async () => {
      (shiftsStoreMock as any).delete = vi.fn().mockResolvedValue(null);
      const shift = { id: 's1' } as any;
      confirmationDialogMock.confirm.mockResolvedValue(true);

      await (component as any).handleClickDeleteShift(shift);

      expect(confirmationDialogMock.confirm).toHaveBeenCalled();
      expect((shiftsStoreMock as any).delete).toHaveBeenCalledWith('s1');
      expect(exchangesMock.reload).toHaveBeenCalled();
    });

    it('should delete an exchange after confirmation', async () => {
      (exchangesMock as any).delete = vi.fn().mockResolvedValue(null);
      const exchange = { id: 'e1' } as any;
      confirmationDialogMock.confirm.mockResolvedValue(true);

      await (component as any).handleClickDeleteExchange(exchange);

      expect(confirmationDialogMock.confirm).toHaveBeenCalled();
      expect((exchangesMock as any).delete).toHaveBeenCalledWith('e1');
      expect(shiftsStoreMock.reload).toHaveBeenCalled();
    });

    it('should handleOfferExchange correctly', async () => {
      exchangesMock.request.mockResolvedValue(null);

      await (component as any).handleOfferExchange('s1');

      expect(exchangesMock.request).toHaveBeenCalledWith('s1', {});
      expect(shiftsStoreMock.reload).toHaveBeenCalled();
      expect(exchangesMock.reload).toHaveBeenCalled();
    });

    it('should handleAcceptExchange correctly', async () => {
      exchangesMock.accept.mockResolvedValue(null);

      await (component as any).handleAcceptExchange('e1');

      expect(exchangesMock.accept).toHaveBeenCalledWith('e1');
      expect(shiftsStoreMock.reload).toHaveBeenCalled();
      expect(exchangesMock.reload).toHaveBeenCalled();
    });
  });
});
