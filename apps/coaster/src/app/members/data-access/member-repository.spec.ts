import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { MemberRepository } from './member-repository';

describe('MemberRepository', () => {
  let service: MemberRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('should call invite member endpoint', async () => {
    const mockMember: BarMember = {
      id: asBarMemberId('member-1'),
      userId: asUserId('user-1'),
      barId: asBarId('bar-1'),
      role: BarRole.STAFF,
      active: true,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      userImage: '',
    };

    const promise = service.invite(asBarId('bar-1'), {
      email: 'test@test.com',
      role: BarRole.STAFF,
    });

    const req = httpMock.expectOne(service.routes.invite(asBarId('bar-1')));
    expect(req.request.method).toBe('POST');
    req.flush(mockMember);

    const result = await promise;
    expect(result).toEqual(mockMember);
  });
});
