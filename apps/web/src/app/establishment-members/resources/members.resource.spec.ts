import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, EstablishmentMember } from '@coaster/common';
import { asEstablishmentId, EstablishmentRole } from '@coaster/common';
import { Realtime } from '@coaster/core';
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

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
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

  it('should know when a single owner is left', () => {
    expect(isOnlyOwner([member('a', EstablishmentRole.OWNER), member('b')])).toBe(true);
    expect(isOnlyOwner([member('a', EstablishmentRole.OWNER), member('b', EstablishmentRole.OWNER)])).toBe(false);
  });
});
