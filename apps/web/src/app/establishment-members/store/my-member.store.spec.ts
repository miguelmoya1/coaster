import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EstablishmentRole } from '@coaster/establishments';
import { asEstablishmentId, Realtime, type EstablishmentId } from '@coaster/core';
import { fakeRealtime } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyMember } from '../services/my-member';
import { MyMemberStore } from './my-member.store';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/members/me`;

const me = (role: EstablishmentRole) => ({ id: 'member-1', userId: 'user-1', establishmentId, role, active: true });

describe('MyMemberStore', () => {
  const reconnected = signal(0);
  let http: HttpTestingController;
  let store: MyMemberStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MyMember, useValue: { execute: (id?: EstablishmentId) => (id ? url : undefined) } },
        { provide: Realtime, useValue: fakeRealtime({ reconnected }) },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MyMemberStore);
  });

  it('should ask for its own member again when the stream comes back, in case its role changed meanwhile', async () => {
    store.setEstablishmentId(establishmentId);
    TestBed.tick();
    http.expectOne(url).flush(me(EstablishmentRole.STAFF));
    await vi.waitFor(() => expect(store.myMember.hasValue()).toBe(true));

    reconnected.update((count) => count + 1);
    TestBed.tick();
    http.expectOne(url).flush(me(EstablishmentRole.MANAGER));

    await vi.waitFor(() => expect(store.myMember.value()?.role).toBe(EstablishmentRole.MANAGER));
  });
});
