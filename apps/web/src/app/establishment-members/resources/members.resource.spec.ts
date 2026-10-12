import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentMember } from '../models/establishment-member.interface';
import { EstablishmentRole } from '@coaster/establishments';
import { asEstablishmentId, Realtime, type EstablishmentId } from '@coaster/core';
import { fakeRealtime } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isOnlyOwner } from '../utils/owners';
import { membersResource } from './members.resource';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/members`;

const member = (id: string, role: EstablishmentRole = EstablishmentRole.STAFF) =>
  ({ id, userId: `user-${id}`, establishmentId, role, active: true }) as unknown as EstablishmentMember;

describe('membersResource', () => {
  let http: HttpTestingController;

  const realtime = {
    memberRemoved: signal<{ id: string } | null>(null),
    memberInvited: signal<{ id: string } | null>(null),
    memberRoleChanged: signal<{ id: string; userId: string; role: string } | null>(null),
  };
  const reconnected = signal(0);

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Realtime, useValue: fakeRealtime({ ...realtime, reconnected }) },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  const loadedWith = async (body: EstablishmentMember[]) => {
    const members = TestBed.runInInjectionContext(() =>
      membersResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(url).flush(body);
    await vi.waitFor(() => expect(members.hasValue()).toBe(true));
    return members;
  };

  it('should drop someone as soon as they are removed', async () => {
    const members = await loadedWith([member('a'), member('b')]);

    realtime.memberRemoved.set({ id: 'a' });
    TestBed.tick();

    expect(members.value()?.map((m) => m.id)).toEqual(['b']);
  });

  it('should ask again when someone is invited or changes role', async () => {
    await loadedWith([member('a')]);

    realtime.memberInvited.set({ id: 'c' });
    TestBed.tick();

    http.expectOne(url);
  });

  it('should ask again when the stream comes back, in case it missed a change', async () => {
    await loadedWith([member('a')]);

    reconnected.update((count) => count + 1);
    TestBed.tick();

    http.expectOne(url);
  });

  it('should know when a single owner is left', () => {
    expect(isOnlyOwner([member('a', EstablishmentRole.OWNER), member('b')])).toBe(true);
    expect(isOnlyOwner([member('a', EstablishmentRole.OWNER), member('b', EstablishmentRole.OWNER)])).toBe(false);
  });
});
