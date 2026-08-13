import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentMember } from '@coaster/common';
import { asEstablishmentId, asEstablishmentMemberId, asUserId, EstablishmentRole } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemberRepository } from './member-repository';

describe('MemberRepository', () => {
  let service: MemberRepository;
  let httpMock: HttpTestingController;

  const mockMember: EstablishmentMember = {
    id: asEstablishmentMemberId('member-1'),
    userId: asUserId('user-1'),
    establishmentId: asEstablishmentId('establishment-1'),
    role: EstablishmentRole.STAFF,
    permissions: [],
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
      expect(service.routes.list(asEstablishmentId('1'))).toBe('/establishments/1/members');
    });

    it('should have the invite route', () => {
      expect(service.routes.invite(asEstablishmentId('1'))).toBe('/establishments/1/members');
    });
  });

  describe('invite', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dto = { email: 'john@test.com', role: EstablishmentRole.STAFF };

    it('should call invite member endpoint', async () => {
      const promise = service.invite(establishmentId, dto);

      const req = httpMock.expectOne(service.routes.invite(establishmentId));
      expect(req.request.method).toBe('POST');
      req.flush(mockMember);

      await promise;
    });

    it('should return mapped member', async () => {
      const res = service.invite(establishmentId, dto);
      httpMock.expectOne(service.routes.invite(establishmentId)).flush(mockMember);

      expect(await res).toEqual(mockMember);
    });
  });
});
