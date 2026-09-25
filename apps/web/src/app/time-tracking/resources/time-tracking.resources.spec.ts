import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Workday } from '@coaster/common';
import { asEstablishmentId, asTimeEntryId, ClockState, TimeEntryType } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageTimeEntries } from '../services/manage-time-entries';
import { clockStateOf, workdayOn } from '../utils/workdays';
import { currentWorkdayResource, myWorkdaysResource, teamWorkdaysResource } from './time-tracking.resources';

const establishmentId = asEstablishmentId('establishment-1');
const base = `/establishments/${establishmentId}/time-entries`;

const workday = (state: ClockState = ClockState.IN, date = '2026-08-08') =>
  ({
    date,
    userId: 'user-1',
    userName: 'Luis',
    state,
    workedMinutes: 120,
    breakMinutes: 15,
    plannedMinutes: 480,
    plannedStart: null,
    plannedEnd: null,
    discrepancies: [],
    entries: [],
  }) as unknown as Workday;

describe('time tracking', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const known = signal<EstablishmentId | undefined>(establishmentId);
  const range = signal({ from: '2026-08-01', to: '2026-08-08' });

  it('should not ask for anything until it knows the establishment', () => {
    TestBed.runInInjectionContext(() => currentWorkdayResource(signal<EstablishmentId | undefined>(undefined)));
    TestBed.tick();

    http.expectNone(() => true);
  });

  it('should load my days, the running one and the team for the range on screen', async () => {
    const [mine, current, team] = TestBed.runInInjectionContext(() => [
      myWorkdaysResource(known, range),
      currentWorkdayResource(known),
      teamWorkdaysResource(known, range),
    ]);
    TestBed.tick();

    http.expectOne(`${base}/me?from=2026-08-01&to=2026-08-08`).flush([workday()]);
    http.expectOne(`${base}/me/current`).flush(workday(ClockState.IN, '2026-07-30'));
    http.expectOne(`${base}?from=2026-08-01&to=2026-08-08`).flush([]);

    await vi.waitFor(() => expect(mine.hasValue() && current.hasValue() && team.hasValue()).toBe(true));
    expect(clockStateOf(current.value())).toBe(ClockState.IN);
  });

  it('should read the clock as out while nothing is running', () => {
    expect(clockStateOf(null)).toBe(ClockState.OUT);
    expect(clockStateOf(undefined)).toBe(ClockState.OUT);
  });

  it('should find the day that is being browsed', () => {
    expect(workdayOn([workday(ClockState.OUT, '2026-08-07'), workday()], '2026-08-08')?.date).toBe('2026-08-08');
  });

  describe('ManageTimeEntries', () => {
    it('should post a punch with where it was made', async () => {
      const clocked = TestBed.inject(ManageTimeEntries).clock(establishmentId, TimeEntryType.CLOCK_IN, {
        latitude: 40.4,
        longitude: -3.7,
      });

      const request = http.expectOne(`${base}/clock`);
      expect(request.request.body).toEqual({ type: TimeEntryType.CLOCK_IN, latitude: 40.4, longitude: -3.7 });
      request.flush({});
      await clocked;
    });

    it('should send the reason when a mark is amended', async () => {
      const amended = TestBed.inject(ManageTimeEntries).amend(establishmentId, asTimeEntryId('entry-1'), {
        occurredAt: '2026-08-08T09:00:00.000Z',
        reason: 'Olvido fichar',
      });

      const request = http.expectOne(`${base}/entry-1/amend`);
      expect(request.request.body).toEqual({ occurredAt: '2026-08-08T09:00:00.000Z', reason: 'Olvido fichar' });
      request.flush({});
      await amended;
    });

    it('should download the timesheet for the range it is given', async () => {
      const exported = TestBed.inject(ManageTimeEntries).exportCsv(establishmentId, {
        from: '2026-08-01',
        to: '2026-08-08',
      });

      const request = http.expectOne(`${base}/export?from=2026-08-01&to=2026-08-08`);
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['dia;empleado'], { type: 'text/csv' }));

      expect(await exported).toBeInstanceOf(Blob);
    });
  });
});
