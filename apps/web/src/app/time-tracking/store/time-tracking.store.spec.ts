import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId, asTimeEntryId, asUserId, ClockState, TimeEntryType } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimeTrackingStore } from './time-tracking.store';

const workday = (date = '2026-08-08', workedMinutes = 120) => ({
  date,
  userId: 'user-1',
  userName: 'Luis',
  state: ClockState.OUT,
  workedMinutes,
  breakMinutes: 15,
  plannedMinutes: 480,
  plannedStart: null,
  plannedEnd: null,
  discrepancies: [],
  entries: [],
});

const ESTABLISHMENT = 'establishment-1';
const base = `/establishments/${ESTABLISHMENT}/time-entries`;
const mine = (from: string, to: string) => `${base}/me?from=${from}&to=${to}`;

const SESSION = `${base}/session`;
const FICHIT = 'https://api.fichit.es';
const HANDOVER = {
  baseUrl: FICHIT,
  companyId: 'c_1',
  employeeId: 'e_1',
  session: { access_token: 'jwt', expires_at: '2026-08-08T10:00:00Z', refresh_token: 'r' },
};

describe('TimeTrackingStore', () => {
  let store: TimeTrackingStore;
  let httpMock: HttpTestingController;

  const settle = async () => {
    for (let round = 0; round < 5; round += 1) {
      TestBed.tick();
      await Promise.resolve();
    }
    TestBed.tick();
  };

  const handItOver = () => httpMock.expectOne(SESSION).flush(HANDOVER);
  const sayState = (state: string) => httpMock.expectOne(`${FICHIT}/api/v1/me/status`).flush({ state });

  const openOn = async (state = 'out') => {
    store.setEstablishmentId(asEstablishmentId(ESTABLISHMENT));
    await settle();
    handItOver();
    await settle();
    sayState(state);
    await settle();
  };

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

  it('should not ask for anything until it knows the establishment', () => {
    TestBed.tick();

    httpMock.expectNone(() => true);
  });

  it('should report the clock as out while nothing has loaded', () => {
    expect(store.clockState()).toBe(ClockState.OUT);
  });

  it('should ask Coaster for a Fichit session as soon as it knows the establishment', async () => {
    await openOn('in');

    expect(store.clockState()).toBe(ClockState.IN);
  });

  it('should read a worker on a break as on a break', async () => {
    await openOn('on_break');

    expect(store.clockState()).toBe(ClockState.ON_BREAK);
  });

  it('should stay out when Fichit cannot be reached at all', async () => {
    store.setEstablishmentId(asEstablishmentId(ESTABLISHMENT));
    await settle();
    httpMock.expectOne(SESSION).flush({}, { status: 503, statusText: 'Service Unavailable' });
    await settle();

    expect(store.clockState()).toBe(ClockState.OUT);
  });

  it('should load the browsed range through Coaster', async () => {
    await openOn();
    store.setRange('2026-08-08', '2026-08-08');
    await settle();

    const request = httpMock.expectOne(mine('2026-08-08', '2026-08-08'));
    expect(request.request.method).toBe('GET');
    request.flush([workday()]);
    await settle();

    expect(store.myWorkday()?.workedMinutes).toBe(120);
  });

  it('should leave the team timesheet alone until it is enabled', async () => {
    await openOn();
    store.setRange('2026-08-08', '2026-08-08');
    await settle();
    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
    await settle();

    httpMock.expectNone(`${base}?from=2026-08-08&to=2026-08-08`);

    store.setTeamEnabled(true);
    await settle();
    httpMock.expectOne(`${base}?from=2026-08-08&to=2026-08-08`).flush([]);
  });

  describe('punching', () => {
    it('should go straight to Fichit, never through Coaster', async () => {
      await openOn();

      const punching = store.clock(TimeEntryType.CLOCK_IN, { latitude: 40.4, longitude: -3.7 });
      await settle();

      const punch = httpMock.expectOne(`${FICHIT}/api/v1/me/punches`);
      expect(punch.request.method).toBe('POST');
      expect(punch.request.body).toEqual({ kind: 'in', latitude: 40.4, longitude: -3.7 });
      expect(punch.request.headers.get('Authorization')).toBe('Bearer jwt');
      expect(punch.request.headers.get('Idempotency-Key')).toBeTruthy();
      punch.flush({});
      await settle();

      sayState('in');
      await punching;
      await settle();

      expect(store.clockState()).toBe(ClockState.IN);
    });

    it('should mint a new session and retry when the Fichit one has expired', async () => {
      await openOn();

      const punching = store.clock(TimeEntryType.CLOCK_IN);
      await settle();

      httpMock
        .expectOne(`${FICHIT}/api/v1/me/punches`)
        .flush({ error: { code: 'unauthorized' } }, { status: 401, statusText: 'Unauthorized' });
      await settle();

      handItOver();
      await settle();
      httpMock.expectOne(`${FICHIT}/api/v1/me/punches`).flush({});
      await settle();

      sayState('in');
      await punching;
      await settle();

      expect(store.clockState()).toBe(ClockState.IN);
    });

    it('should go back for the real state even when the punch was refused', async () => {
      await openOn();

      const punching = store.clock(TimeEntryType.CLOCK_OUT);
      await settle();

      httpMock
        .expectOne(`${FICHIT}/api/v1/me/punches`)
        .flush({ error: { code: 'invalid_sequence' } }, { status: 409, statusText: 'Conflict' });
      await settle();

      sayState('in');
      await expect(punching).rejects.toBeDefined();
      await settle();

      expect(store.clockState()).toBe(ClockState.IN);
    });
  });

  describe('correcting the register', () => {
    it('should send a manual mark through Coaster, which owns the permission', async () => {
      await openOn();
      store.setRange('2026-08-08', '2026-08-08');
      await settle();
      httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
      await settle();

      const creating = store.createEntry({
        userId: asUserId('user-1'),
        type: TimeEntryType.CLOCK_IN,
        occurredAt: '2026-08-08T08:00:00.000Z',
        reason: 'se le olvidó fichar',
      });
      await settle();

      const request = httpMock.expectOne(base);
      expect(request.request.body).toMatchObject({ type: TimeEntryType.CLOCK_IN, reason: 'se le olvidó fichar' });
      request.flush(null);
      await settle();

      httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
      await creating;
    });

    it('should send the reason when a mark is amended', async () => {
      await openOn();
      store.setRange('2026-08-08', '2026-08-08');
      await settle();
      httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
      await settle();

      const amending = store.amend(asTimeEntryId('entry-1'), {
        occurredAt: '2026-08-08T08:05:00.000Z',
        reason: 'fichó cinco minutos tarde',
      });
      await settle();

      const request = httpMock.expectOne(`${base}/entry-1/amend`);
      expect(request.request.body).toMatchObject({ reason: 'fichó cinco minutos tarde' });
      request.flush(null);
      await settle();

      httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
      await amending;
    });
  });

  it('should download the timesheet for the browsed range', async () => {
    await openOn();
    store.setRange('2026-08-01', '2026-08-31');
    await settle();
    httpMock.expectOne(mine('2026-08-01', '2026-08-31')).flush([]);
    await settle();

    const downloading = store.exportCsv();
    await settle();

    const request = httpMock.expectOne(`${base}/export?from=2026-08-01&to=2026-08-31`);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['dia;empleado']));

    await downloading;
  });

  it('should refuse to act without an establishment', async () => {
    await expect(store.clock(TimeEntryType.CLOCK_IN)).rejects.toThrow();
  });
});
