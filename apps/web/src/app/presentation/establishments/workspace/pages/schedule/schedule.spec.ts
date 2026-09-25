import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MyMemberStore } from '@coaster/establishment-members';
import type { EstablishmentMember, Shift, ShiftExchange, Workday } from '@coaster/common';
import { ClockState, TimeEntryType } from '@coaster/common';
import { ManageTimeEntries } from '@coaster/time-tracking';
import { ManageExchanges } from '@coaster/exchanges';
import { ManageShifts } from '@coaster/shifts';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import Schedule from './schedule';

describe('Schedule', () => {
  let component: Schedule;
  let fixture: ComponentFixture<Schedule>;

  let shifts = fakeResource<Shift[]>([]);
  let exchanges = fakeResource<ShiftExchange[]>([]);
  let myWorkdays = fakeResource<Workday[]>([]);
  let runningWorkday = fakeResource<Workday | null>(null);
  let teamWorkdays = fakeResource<Workday[]>([]);

  const myMemberStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue(undefined),
      hasValue: vi.fn().mockReturnValue(true),
    },
    hasPermission: vi.fn().mockReturnValue(false),
  };

  const shiftsStoreMock = {
    delete: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    listBetween: vi.fn().mockResolvedValue([]),
  };

  const timeTrackingStoreMock = {
    clock: vi.fn().mockResolvedValue(undefined),
    exportCsv: vi.fn(),
    verifyIntegrity: vi.fn(),
  };

  const exchangesMock = {
    accept: vi.fn(),
    request: vi.fn(),
    delete: vi.fn(),
  };

  const confirmationDialogMock = {
    confirm: vi.fn(),
  };

  const bottomSheetMock = {
    open: vi.fn().mockReturnValue({ dismiss: vi.fn() }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Schedule],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ManageShifts, useValue: shiftsStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: ManageExchanges, useValue: exchangesMock },
        { provide: ConfirmationDialog, useValue: confirmationDialogMock },
        { provide: ManageTimeEntries, useValue: timeTrackingStoreMock },
        { provide: MatBottomSheet, useValue: bottomSheetMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    shifts = fakeResource<Shift[]>([]);
    exchanges = fakeResource<ShiftExchange[]>([]);
    myWorkdays = fakeResource<Workday[]>([]);
    runningWorkday = fakeResource<Workday | null>(null);
    teamWorkdays = fakeResource<Workday[]>([]);

    fixture = TestBed.createComponent(Schedule);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.componentRef.setInput('shifts', shifts.resource);
    fixture.componentRef.setInput('exchanges', exchanges.resource);
    fixture.componentRef.setInput('members', fakeResource<EstablishmentMember[]>([]).resource);
    fixture.componentRef.setInput('myWorkdays', myWorkdays.resource);
    fixture.componentRef.setInput('runningWorkday', runningWorkday.resource);
    fixture.componentRef.setInput('teamWorkdays', teamWorkdays.resource);
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
    it('should render the title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.heading-2');
      expect(title).toBeTruthy();
    });

    it('should render the navigation header', () => {
      fixture.detectChanges();
      const nav = fixture.nativeElement.querySelector('coaster-schedule-navigation');
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

    it('should delete a shift after confirmation, and bring shifts and exchanges up to date', async () => {
      confirmationDialogMock.confirm.mockResolvedValue(true);

      await (component as any).handleClickDeleteShift({ id: 's1' });

      expect(shiftsStoreMock.delete).toHaveBeenCalledWith('establishment-1', 's1');
      expect(shifts.reload).toHaveBeenCalled();
      expect(exchanges.reload).toHaveBeenCalled();
    });

    it('should delete an exchange after confirmation', async () => {
      exchangesMock.delete.mockResolvedValue(null);
      confirmationDialogMock.confirm.mockResolvedValue(true);

      await (component as any).handleClickDeleteExchange({ id: 'e1' });

      expect(exchangesMock.delete).toHaveBeenCalledWith('establishment-1', 'e1');
      expect(shifts.reload).toHaveBeenCalled();
    });

    it('should offer a shift and bring shifts and exchanges up to date', async () => {
      exchangesMock.request.mockResolvedValue(null);

      await (component as any).handleOfferExchange('s1');

      expect(exchangesMock.request).toHaveBeenCalledWith('establishment-1', 's1', {});
      expect(shifts.reload).toHaveBeenCalled();
      expect(exchanges.reload).toHaveBeenCalled();
    });

    it('should accept an exchange and bring shifts and exchanges up to date', async () => {
      exchangesMock.accept.mockResolvedValue(null);

      await (component as any).handleAcceptExchange('e1');

      expect(exchangesMock.accept).toHaveBeenCalledWith('establishment-1', 'e1');
      expect(shifts.reload).toHaveBeenCalled();
      expect(exchanges.reload).toHaveBeenCalled();
    });
  });

  describe('clocking', () => {
    it('should read the clock from the running workday', () => {
      runningWorkday.resolve({ state: ClockState.IN, date: '2026-08-08' } as Workday);

      expect(component.clockState()).toBe(ClockState.IN);
    });

    it('should go back to the server after a punch even when it is refused, instead of keeping a stale picture', async () => {
      timeTrackingStoreMock.clock.mockRejectedValueOnce(new Error('INVALID_CLOCK_SEQUENCE'));

      await (component as any).handleClock(TimeEntryType.CLOCK_IN);

      expect(myWorkdays.reload).toHaveBeenCalled();
      expect(runningWorkday.reload).toHaveBeenCalled();
      expect(teamWorkdays.reload).toHaveBeenCalled();
    });
  });
});
