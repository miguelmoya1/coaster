import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import {
  asBarId,
  asBarMemberId,
  asUserId,
  BarMember,
  BarRole,
} from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';
import { BarMembers } from './bar-members';

describe('BarMembers', () => {
  let service: BarMembers;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/members` };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MemberRepository,
          useValue: { routes: mockRoutes },
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

  it('should initially have undefined list', () => {
    expect(service.list.value()).toBeUndefined();
  });

  it('should fetch members when selectBar is called', () => {
    const mockMembers: BarMember[] = [
      {
        id: asBarMemberId('member-1'),
        userId: asUserId('user-1'),
        barId: asBarId('bar-1'),
        role: BarRole.OWNER,
        active: true,
      },
    ];

    tick();
    service.selectBar(asBarId('bar-1'));
    tick();

    const req = httpMock.expectOne('/bars/bar-1/members');
    expect(req.request.method).toBe('GET');
    req.flush(mockMembers);

    expect(service.list.value()).toEqual(mockMembers);
  });

  it('should clear list when bar is cleared', () => {
    service.selectBar(asBarId('bar-1'));
    tick();
    const req = httpMock.expectOne('/bars/bar-1/members');
    req.flush([]);

    service.clearBar();
    tick();
    expect(service.list.value()).toBeUndefined();
  });
});
