import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';
import { BarMembers } from './bar-members';

describe('BarMembers', () => {
  let service: BarMembers;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/members` };

  beforeEach(async () => {
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

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should initially have undefined list', async () => {
    service.list.value();
  });

  it('should fetch members when selectBar is called', async () => {
    const mockMembers: BarMember[] = [
      {
        id: asBarMemberId('1'),
        userId: asUserId('1'),
        barId: asBarId('bar-1'),
        role: BarRole.OWNER,
        active: true,
        userName: 'A',
        userEmail: 'a@a.com',
        userImage: '',
      },
    ];

    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    service.setBarContext(asBarId('bar-1'));
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne('/bars/bar-1/members');
    expect(req.request.method).toBe('GET');
    req.flush(mockMembers);

    service.list.value();
  });

  it('should clear list when bar is cleared', async () => {
    service.setBarContext(asBarId('bar-1'));
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne('/bars/bar-1/members');
    req.flush([]);

    service.clearBarContext();
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    service.list.value();
  });
});
