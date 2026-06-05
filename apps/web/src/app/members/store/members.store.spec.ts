import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { BarMember } from '@coaster/common';
import { asBarId, asBarMemberId, asUserId, BarRole } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MembersStore } from './members.store';

describe('MembersStore', () => {
  let store: MembersStore;
  let httpMock: HttpTestingController;

  const mockMembers: BarMember[] = [
    {
      id: asBarMemberId('member-1'),
      userId: asUserId('user-1'),
      barId: asBarId('bar-1'),
      role: BarRole.STAFF,
      permissions: [],
      active: true,
      userName: 'John Doe',
      userEmail: 'john@test.com',
      userImage: 'https://photo.url/test.jpg',
    },
    {
      id: asBarMemberId('member-2'),
      userId: asUserId('user-2'),
      barId: asBarId('bar-1'),
      role: BarRole.OWNER,
      permissions: [],
      active: true,
      userName: 'Jane Doe',
      userEmail: 'jane@test.com',
      userImage: 'https://photo.url/test.jpg',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideZonelessChangeDetection()],
    });

    store = TestBed.inject(MembersStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('list', () => {
    it('should be idle at start', () => {
      expect(store.list.status()).toBe('idle');
    });

    it('should fetch members when barId is set', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const req = httpMock.expectOne(`/bars/${barId}/members`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMembers);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.hasValue()).toBe(true);
      expect(store.list.value()).toEqual(mockMembers);
    });

    it('should calculate isOnlyOwner correctly', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      // We have one OWNER (Jane Doe)
      expect(store.isOnlyOwner()).toBe(true);

      // Add another owner
      const twoOwners = [
        ...mockMembers,
        {
          id: asBarMemberId('member-3'),
          userId: asUserId('user-3'),
          barId: asBarId('bar-1'),
          role: BarRole.OWNER,
          permissions: [],
          active: true,
          userName: 'Owner 2',
          userEmail: 'owner2@test.com',
          userImage: '',
        },
      ];
      store.reload();
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/members`).flush(twoOwners);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isOnlyOwner()).toBe(false);
    });

    it('should be idle if barId is not set', () => {
      TestBed.tick();
      httpMock.expectNone(() => true);
      expect(store.list.status()).toBe('idle');
    });

    it('should return to idle when context is cleared', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.hasValue()).toBe(true);

      store.setBarId(undefined);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.status()).toBe('idle');
      expect(store.list.hasValue()).toBe(false);
    });
  });

  describe('invite', () => {
    it('should add a member to the list after successful invite', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/members`).flush([]);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const newMember: BarMember = {
        ...mockMembers[0],
        id: asBarMemberId('new-member'),
      };

      const invitePromise = store.invite({ email: 'new@test.com', role: BarRole.STAFF });

      const req = httpMock.expectOne(`/bars/${barId}/members`);
      expect(req.request.method).toBe('POST');
      req.flush(newMember);
      TestBed.tick();

      await invitePromise;
      TestBed.tick();

      // invite calls reload(), which triggers a new GET
      const reloadReq = httpMock.expectOne(`/bars/${barId}/members`);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush([newMember]);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.value()).toContainEqual(newMember);
    });
  });

  describe('remove', () => {
    it('should remove a member from the list after successful removal', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const memberIdToRemove = mockMembers[0].id;
      const removePromise = store.remove(memberIdToRemove);

      const req = httpMock.expectOne(`/bars/${barId}/members/${memberIdToRemove}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      TestBed.tick();

      await removePromise;
      TestBed.tick();

      expect(store.list.value()).not.toContainEqual(mockMembers[0]);
      expect(store.list.value()).toContainEqual(mockMembers[1]);
    });
  });
});
