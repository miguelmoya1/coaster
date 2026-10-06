import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Shift } from '../models/shift.interface';
import { asEstablishmentId, Realtime, type EstablishmentId } from '@coaster/core';
import { fakeRealtime } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shiftsResource } from './shifts.resource';

const establishmentId = asEstablishmentId('establishment-1');
const range = { startIso: '2026-09-21T22:00:00.000Z', endIso: '2026-09-28T21:59:59.999Z' };
const url = `/establishments/${establishmentId}/shifts?startDate=${range.startIso}&endDate=${range.endIso}`;

const shift = (id: string) =>
  ({
    id,
    establishmentId,
    userId: 'user-1',
    userName: 'Luis',
    startTime: '2026-09-24T08:00:00.000Z',
    endTime: '2026-09-24T16:00:00.000Z',
  }) as unknown as Shift;

describe('shiftsResource', () => {
  let http: HttpTestingController;

  const realtime = {
    shiftCreated: signal<Shift | null>(null),
    shiftDeleted: signal<{ id: string } | null>(null),
  };
  const reconnected = signal(0);

  beforeEach(() => {
    realtime.shiftCreated.set(null);
    realtime.shiftDeleted.set(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Realtime, useValue: fakeRealtime({ ...realtime, reconnected }) },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  const loadedWith = async (body: Shift[]) => {
    const shifts = TestBed.runInInjectionContext(() =>
      shiftsResource(signal<EstablishmentId | undefined>(establishmentId), signal(range)),
    );
    TestBed.tick();
    http.expectOne(url).flush(body);
    await vi.waitFor(() => expect(shifts.hasValue()).toBe(true));
    return shifts;
  };

  it('should ask for the range on screen, and follow shifts as they are created and deleted', async () => {
    const shifts = await loadedWith([shift('a'), shift('b')]);

    realtime.shiftDeleted.set({ id: 'a' });
    TestBed.tick();
    expect(shifts.value()?.map((s) => s.id)).toEqual(['b']);

    realtime.shiftCreated.set(shift('c'));
    TestBed.tick();
    http.expectOne(url);
  });

  it('should ask for the range again when the stream comes back, in case it missed a shift', async () => {
    await loadedWith([shift('a')]);

    reconnected.update((count) => count + 1);
    TestBed.tick();

    http.expectOne(url);
  });
});
