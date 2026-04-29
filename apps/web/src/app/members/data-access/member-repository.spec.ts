import { afterEach, beforeEach, describe, expect, it, test } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/common';
import { MemberRepository } from './member-repository';

describe('MemberRepository', () => {
  let service: MemberRepository;
  let httpMock: HttpTestingController;

  const mockMember: BarMember = {
    id: asBarMemberId('member-1'),
    userId: asUserId('user-1'),
    barId: asBarId('bar-1'),
    role: BarRole.STAFF,
    active: true,
    userName: 'John Doe',
    userEmail: 'john@test.com',
    userImage: 'https://photo.url/test.jpg',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(MemberRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the list route', () => {
      expect(service.routes.list(asBarId('1'))).toBe('/bars/1/members');
    });

    it('should have the invite route', () => {
      expect(service.routes.invite(asBarId('1'))).toBe('/bars/1/members');
    });
  });

  describe('invite', () => {
    const barId = asBarId('bar-1');
    const dto = { email: 'john@test.com', role: BarRole.STAFF };

    it('should call invite member endpoint', async () => {
      const promise = service.invite(barId, dto);

      const req = httpMock.expectOne(service.routes.invite(barId));
      expect(req.request.method).toBe('POST');
      req.flush(mockMember);

      await promise;
    });

    it('should return mapped member', async () => {
      const res = service.invite(barId, dto);
      httpMock.expectOne(service.routes.invite(barId)).flush(mockMember);

      expect(await res).toEqual(mockMember);
    });
  });
});
