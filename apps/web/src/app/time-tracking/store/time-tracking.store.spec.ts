import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId, asTimeEntryId, ClockState, TimeEntryType } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimeTrackingStore } from './time-tracking.store';

const workday = (state: ClockState = ClockState.IN) => ({
  date: '2026-08-08',
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
});

describe('TimeTrackingStore', () => {
  let store: TimeTrackingStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideZonelessChangeDetection()],
    });

    store = TestBed.inject(TimeTrackingStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should not ask for anything until it knows the establishment and the range', () => {
    TestBed.tick();

    httpMock.expectNone(() => true);
  });

  it('should load my own workday once establishment and range are set', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08');
    expect(request.request.method).toBe('GET');
    request.flush([workday()]);

    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();

    expect(store.myWorkday()?.workedMinutes).toBe(120);
    expect(store.clockState()).toBe(ClockState.IN);
  });

  it('should report the clock as out while nothing has loaded', () => {
    expect(store.clockState()).toBe(ClockState.OUT);
  });

  it('should leave the team timesheet alone until it is enabled', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08').flush([]);
    httpMock.expectNone('/establishments/establishment-1/time-entries?from=2026-08-08&to=2026-08-08');

    store.setTeamEnabled(true);
    TestBed.tick();

    httpMock.expectOne('/establishments/establishment-1/time-entries?from=2026-08-08&to=2026-08-08').flush([workday()]);
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();

    expect(store.teamWorkdays.value()?.length).toBe(1);
  });

  it('should post a punch and refresh what it shows', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08').flush([]);

    const clocked = store.clock(TimeEntryType.CLOCK_IN, { latitude: 40.4, longitude: -3.7 });

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/clock');
    expect(request.request.body).toEqual({ type: TimeEntryType.CLOCK_IN, latitude: 40.4, longitude: -3.7 });
    request.flush({});

    await clocked;
    TestBed.tick();

    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08').flush([]);
  });

  it('should send the reason when a mark is amended', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08').flush([]);

    const amended = store.amend(asTimeEntryId('entry-1'), {
      occurredAt: '2026-08-08T09:00:00.000Z',
      reason: 'Olvido fichar',
    });

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/entry-1/amend');
    expect(request.request.body).toEqual({ occurredAt: '2026-08-08T09:00:00.000Z', reason: 'Olvido fichar' });
    request.flush({});

    await amended;
    TestBed.tick();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-08&to=2026-08-08').flush([]);
  });

  it('should download the timesheet as a file', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-01', '2026-08-08');
    TestBed.tick();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me?from=2026-08-01&to=2026-08-08').flush([]);

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
