import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId, asTimeEntryId, ClockState, TimeEntryType } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastNight, TimeTrackingStore, today } from './time-tracking.store';

const workday = (state: ClockState = ClockState.IN, date = '2026-08-08', workedMinutes = 120) => ({
  date,
  userId: 'user-1',
  userName: 'Luis',
  state,
  workedMinutes,
  breakMinutes: 15,
  plannedMinutes: 480,
  plannedStart: null,
  plannedEnd: null,
  discrepancies: [],
  entries: [],
});

const mine = (from: string, to: string) => `/establishments/establishment-1/time-entries/me?from=${from}&to=${to}`;

describe('TimeTrackingStore', () => {
  let store: TimeTrackingStore;
  let httpMock: HttpTestingController;

  const settle = async () => {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  };

  /** The clock card asks for last night as well as today, so an unclosed night is still actionable. */
  const flushActionable = (workdays: unknown[] = []) =>
    httpMock.expectOne(mine(lastNight(), today())).flush(workdays);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideZonelessChangeDetection()],
    });

    store = TestBed.inject(TimeTrackingStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('should not ask for anything until it knows the establishment', () => {
    TestBed.tick();

    httpMock.expectNone(() => true);
  });

  it('should ask what can be clocked on as soon as it knows the establishment', () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    TestBed.tick();

    flushActionable();
  });

  it('should load the browsed day once establishment and range are set', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    flushActionable();
    const request = httpMock.expectOne(mine('2026-08-08', '2026-08-08'));
    expect(request.request.method).toBe('GET');
    request.flush([workday()]);

    await settle();

    expect(store.myWorkday()?.workedMinutes).toBe(120);
  });

  it('should report the clock as out while nothing has loaded', () => {
    expect(store.clockState()).toBe(ClockState.OUT);
  });

  describe('the workday the clock card acts on', () => {
    const load = async (workdays: unknown[]) => {
      store.setEstablishmentId(asEstablishmentId('establishment-1'));
      TestBed.tick();

      flushActionable(workdays);

      await settle();
    };

    /* Madrid runs two hours ahead of UTC in August: 01:00Z is 03:00, still the small hours. */
    const DURING_THE_NIGHT = new Date('2026-08-15T01:00:00.000Z');
    const MID_MORNING = new Date('2026-08-15T08:00:00.000Z');

    it('should follow the day being worked', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(MID_MORNING);

      await load([workday(ClockState.IN, today(), 120)]);

      expect(store.clockState()).toBe(ClockState.IN);
      expect(store.actionableWorkday()?.workedMinutes).toBe(120);
      expect(store.unclosedWorkday()).toBeUndefined();
    });

    it('should stay on last night while the small hours last, so a closing shift can clock out', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(DURING_THE_NIGHT);

      await load([workday(ClockState.IN, lastNight(), 300), workday(ClockState.OUT, today(), 0)]);

      expect(store.clockState()).toBe(ClockState.IN);
      expect(store.actionableWorkday()?.date).toBe(lastNight());
      expect(store.unclosedWorkday()).toBeUndefined();
    });

    it('should let the worker start today once the night is over, flagging the day nobody closed', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(MID_MORNING);

      await load([workday(ClockState.IN, lastNight(), 300), workday(ClockState.OUT, today(), 0)]);

      expect(store.clockState()).toBe(ClockState.OUT);
      expect(store.actionableWorkday()?.date).toBe(today());
      expect(store.unclosedWorkday()?.date).toBe(lastNight());
    });

    it('should show today once the day is closed, keeping what was worked', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(MID_MORNING);

      await load([workday(ClockState.OUT, lastNight(), 300), workday(ClockState.OUT, today(), 480)]);

      expect(store.clockState()).toBe(ClockState.OUT);
      expect(store.actionableWorkday()?.workedMinutes).toBe(480);
      expect(store.unclosedWorkday()).toBeUndefined();
    });

    it('should stay out when neither day has anything on it', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(MID_MORNING);

      await load([]);

      expect(store.clockState()).toBe(ClockState.OUT);
      expect(store.actionableWorkday()).toBeUndefined();
      expect(store.unclosedWorkday()).toBeUndefined();
    });
  });

  it('should leave the team timesheet alone until it is enabled', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    flushActionable();
    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
    httpMock.expectNone('/establishments/establishment-1/time-entries?from=2026-08-08&to=2026-08-08');

    store.setTeamEnabled(true);
    TestBed.tick();

    httpMock.expectOne('/establishments/establishment-1/time-entries?from=2026-08-08&to=2026-08-08').flush([workday()]);

    await settle();

    expect(store.teamWorkdays.value()?.length).toBe(1);
  });

  it('should post a punch and refresh both what it browses and what it can act on', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();
    flushActionable();
    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);

    const clocked = store.clock(TimeEntryType.CLOCK_IN, { latitude: 40.4, longitude: -3.7 });

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/clock');
    expect(request.request.body).toEqual({ type: TimeEntryType.CLOCK_IN, latitude: 40.4, longitude: -3.7 });
    request.flush({});

    await clocked;
    TestBed.tick();

    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
    flushActionable();
  });

  it('should send the reason when a mark is amended', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();
    flushActionable();
    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);

    const amended = store.amend(asTimeEntryId('entry-1'), {
      occurredAt: '2026-08-08T09:00:00.000Z',
      reason: 'Olvido fichar',
    });

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/entry-1/amend');
    expect(request.request.body).toEqual({ occurredAt: '2026-08-08T09:00:00.000Z', reason: 'Olvido fichar' });
    request.flush({});

    await amended;
    TestBed.tick();

    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
    flushActionable();
  });

  it('should download the timesheet for the browsed range, not the clock one', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-01', '2026-08-08');
    TestBed.tick();
    flushActionable();
    httpMock.expectOne(mine('2026-08-01', '2026-08-08')).flush([]);

    const exported = store.exportCsv();

    const request = httpMock.expectOne(
      '/establishments/establishment-1/time-entries/export?from=2026-08-01&to=2026-08-08',
    );
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['dia;empleado'], { type: 'text/csv' }));

    expect(await exported).toBeInstanceOf(Blob);
  });

  it('should refuse to act without an establishment', async () => {
    await expect(store.clock(TimeEntryType.CLOCK_IN)).rejects.toThrow('MISSING_ESTABLISHMENT_ID');
  });
});
