import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId, asTimeEntryId, ClockState, TimeEntryType } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimeTrackingStore } from './time-tracking.store';

type Workday = ReturnType<typeof workday>;

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
const CURRENT = '/establishments/establishment-1/time-entries/me/current';

describe('TimeTrackingStore', () => {
  let store: TimeTrackingStore;
  let httpMock: HttpTestingController;

  const settle = async () => {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  };

  const flushCurrent = (current: Workday | null = null) => httpMock.expectOne(CURRENT).flush(current);

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

  it('should ask the server which workday is running as soon as it knows the establishment', () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    TestBed.tick();

    flushCurrent();
  });

  it('should load the browsed day once establishment and range are set', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    flushCurrent();
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
    const load = async (current: Workday | null) => {
      store.setEstablishmentId(asEstablishmentId('establishment-1'));
      TestBed.tick();

      flushCurrent(current);

      await settle();
    };

    it('should follow whatever the server says is running', async () => {
      await load(workday(ClockState.IN, '2026-08-08', 120));

      expect(store.clockState()).toBe(ClockState.IN);
      expect(store.currentWorkday()?.workedMinutes).toBe(120);
    });

    it('should keep acting on a day opened long before today', async () => {
      await load(workday(ClockState.ON_BREAK, '2026-08-01', 4000));

      expect(store.clockState()).toBe(ClockState.ON_BREAK);
      expect(store.currentWorkday()?.date).toBe('2026-08-01');
    });

    it('should stay out when no day is running', async () => {
      await load(null);

      expect(store.clockState()).toBe(ClockState.OUT);
      expect(store.currentWorkday()).toBeUndefined();
    });
  });

  it('should leave the team timesheet alone until it is enabled', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();

    flushCurrent();
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
    flushCurrent();
    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);

    const clocked = store.clock(TimeEntryType.CLOCK_IN, { latitude: 40.4, longitude: -3.7 });

    const request = httpMock.expectOne('/establishments/establishment-1/time-entries/clock');
    expect(request.request.body).toEqual({ type: TimeEntryType.CLOCK_IN, latitude: 40.4, longitude: -3.7 });
    request.flush({});

    await clocked;
    TestBed.tick();

    httpMock.expectOne(mine('2026-08-08', '2026-08-08')).flush([]);
    flushCurrent();
  });

  it('should go back to the server when a punch is refused, instead of keeping a stale picture', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    TestBed.tick();
    flushCurrent(null);

    const refused = store.clock(TimeEntryType.CLOCK_IN);

    httpMock
      .expectOne('/establishments/establishment-1/time-entries/clock')
      .flush({ message: ['INVALID_CLOCK_SEQUENCE'] }, { status: 400, statusText: 'Bad Request' });

    await expect(refused).rejects.toBeDefined();
    TestBed.tick();

    flushCurrent(workday(ClockState.IN, '2026-08-08', 120));
    await settle();

    expect(store.clockState()).toBe(ClockState.IN);
  });

  it('should send the reason when a mark is amended', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-08', '2026-08-08');
    TestBed.tick();
    flushCurrent();
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
    flushCurrent();
  });

  it('should download the timesheet for the browsed range, not the clock one', async () => {
    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    store.setRange('2026-08-01', '2026-08-08');
    TestBed.tick();
    flushCurrent();
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

describe('TimeTrackingStore once clocking moved to Fichit', () => {
  let store: TimeTrackingStore;
  let httpMock: HttpTestingController;

  const SESSION = '/establishments/establishment-1/time-entries/session';
  const handover = {
    baseUrl: 'https://api.fichit.es',
    companyId: 'c_1',
    employeeId: 'e_1',
    session: { access_token: 'jwt', expires_at: '2026-08-08T10:00:00Z', refresh_token: 'r' },
  };

  const settle = async () => {
    for (let round = 0; round < 5; round += 1) {
      TestBed.tick();
      await Promise.resolve();
    }
    TestBed.tick();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideZonelessChangeDetection()],
    });

    store = TestBed.inject(TimeTrackingStore);
    httpMock = TestBed.inject(HttpTestingController);

    store.setEstablishmentId(asEstablishmentId('establishment-1'));
    TestBed.tick();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me/current').flush(null);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const handItOver = () => httpMock.expectOne(SESSION).flush(handover);

  it('asks Coaster for a Fichit session and reads the state from there', async () => {
    store.setClocksInFichit(true);
    await settle();

    handItOver();
    await settle();

    const status = httpMock.expectOne('https://api.fichit.es/api/v1/me/status');
    expect(status.request.headers.get('Authorization')).toBe('Bearer jwt');
    status.flush({ state: 'on_break', state_label: 'en pausa' });

    await settle();
    expect(store.clockState()).toBe(ClockState.ON_BREAK);
  });

  it('punches straight against Fichit, never through Coaster', async () => {
    store.setClocksInFichit(true);
    await settle();
    handItOver();
    await settle();
    httpMock.expectOne('https://api.fichit.es/api/v1/me/status').flush({ state: 'out', state_label: 'fuera' });
    await settle();

    const punching = store.clock(TimeEntryType.CLOCK_IN);
    await settle();

    const punch = httpMock.expectOne('https://api.fichit.es/api/v1/me/punches');
    expect(punch.request.method).toBe('POST');
    expect(punch.request.body).toEqual({ kind: 'in' });
    expect(punch.request.headers.get('Idempotency-Key')).toBeTruthy();
    punch.flush({});

    await settle();
    httpMock.expectOne('https://api.fichit.es/api/v1/me/status').flush({ state: 'in', state_label: 'trabajando' });

    await punching;
    await settle();
    expect(store.clockState()).toBe(ClockState.IN);
  });

  it('mints a new session and retries when the Fichit one has expired', async () => {
    store.setClocksInFichit(true);
    await settle();
    handItOver();
    await settle();
    httpMock.expectOne('https://api.fichit.es/api/v1/me/status').flush({ state: 'out', state_label: 'fuera' });
    await settle();

    const punching = store.clock(TimeEntryType.CLOCK_IN);
    await settle();

    httpMock
      .expectOne('https://api.fichit.es/api/v1/me/punches')
      .flush({ error: { code: 'unauthorized' } }, { status: 401, statusText: 'Unauthorized' });
    await settle();

    handItOver();
    await settle();
    httpMock.expectOne('https://api.fichit.es/api/v1/me/punches').flush({});

    await settle();
    httpMock.expectOne('https://api.fichit.es/api/v1/me/status').flush({ state: 'in', state_label: 'trabajando' });

    await punching;
    await settle();
    expect(store.clockState()).toBe(ClockState.IN);
  });

  it('keeps clocking through Coaster while the establishment has not moved', async () => {
    store.setClocksInFichit(false);
    await settle();

    const punching = store.clock(TimeEntryType.CLOCK_IN);
    await settle();

    httpMock.expectOne('/establishments/establishment-1/time-entries/clock').flush({});
    await settle();
    httpMock.expectOne('/establishments/establishment-1/time-entries/me/current').flush(null);

    await punching;
  });
});
