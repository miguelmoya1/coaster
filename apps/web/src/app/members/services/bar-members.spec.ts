import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarId, BarMember, BarRole } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CurrentBar } from '../../bars';
import { BarMembers } from './bar-members';

describe('BarMembers', () => {
  let service: BarMembers;
  let httpMock: HttpTestingController;

  const currentId = signal<BarId | undefined>(undefined);

  const currentBarMock = {
    currentId: currentId.asReadonly(),
    setBarContext: (barId: BarId | undefined) => currentId.set(barId),
  };

  const mockMembers: BarMember[] = [
    {
      id: asBarMemberId('member-1'),
      userId: asUserId('user-1'),
      barId: asBarId('bar-1'),
      role: BarRole.STAFF,
      active: true,
      userName: 'John Doe',
      userEmail: 'john@test.com',
      userImage: 'https://photo.url/test.jpg',
    },
  ];

  beforeEach(() => {
    currentId.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        {
          provide: CurrentBar,
          useValue: currentBarMock,
        },
      ],
    });
    service = TestBed.inject(BarMembers);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('list', () => {
    it('should be idle at start', () => {
      expect(service.list.status()).toBe('idle');
    });

    it('should fetch members when bar context is set', async () => {
      const barId = asBarId('bar-1');
      currentBarMock.setBarContext(barId);

      TestBed.tick();
      expect(service.list.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.list.hasValue()).toBe(true);
      expect(service.list.value()).toEqual(mockMembers);
    });

    it('should be idle if barId is not set', () => {
      TestBed.tick();
      httpMock.expectNone(() => true);
      expect(service.list.status()).toBe('idle');
    });

    it('should return to idle when context is cleared', async () => {
      const barId = asBarId('bar-1');
      currentBarMock.setBarContext(barId);
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.list.hasValue()).toBe(true);

      currentBarMock.setBarContext(undefined);
      TestBed.tick();
      expect(service.list.status()).toBe('idle');
      expect(service.list.hasValue()).toBe(false);
    });
  });

  describe('reload', () => {
    it('should reload the members', async () => {
      const barId = asBarId('bar-1');
      currentBarMock.setBarContext(barId);
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/members`).flush(mockMembers);
      await TestBed.inject(ApplicationRef).whenStable();

      service.reload();
      TestBed.tick();
      expect(service.list.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/members`).flush([]);
      await TestBed.inject(ApplicationRef).whenStable();
      expect(service.list.value()).toEqual([]);
    });
  });
});
