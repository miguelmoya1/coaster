import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Shift } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shiftsResource } from './shifts.resource';

const establishmentId = asEstablishmentId('establishment-1');
const range = { startIso: '2026-09-21T22:00:00.000Z', endIso: '2026-09-28T21:59:59.999Z' };

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

  beforeEach(() => {
    realtime.shiftCreated.set(null);
    realtime.shiftDeleted.set(null);

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });

    http = TestBed.inject(HttpTestingController);
  });

  it('should ask for the range on screen, and follow shifts as they are created and deleted', async () => {
    const shifts = TestBed.runInInjectionContext(() =>
      shiftsResource(signal<EstablishmentId | undefined>(establishmentId), signal(range)),
    );
    TestBed.tick();
    const url = `/establishments/${establishmentId}/shifts?startDate=${range.startIso}&endDate=${range.endIso}`;
    http.expectOne(url).flush([shift('a'), shift('b')]);
    await vi.waitFor(() => expect(shifts.hasValue()).toBe(true));

    realtime.shiftDeleted.set({ id: 'a' });
    TestBed.tick();
    expect(shifts.value()?.map((s) => s.id)).toEqual(['b']);

    realtime.shiftCreated.set(shift('c'));
    TestBed.tick();
    http.expectOne(url);
  });
});
