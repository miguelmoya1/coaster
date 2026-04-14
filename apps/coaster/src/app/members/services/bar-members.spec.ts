import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
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
        provideZonelessChangeDetection(),
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

  it('should fetch members when setBarContext is called', async () => {
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
    service.setBarContext(asBarId('bar-1'));
    service.list.value();
    TestBed.flushEffects();

    const req = httpMock.expectOne('/bars/bar-1/members');
    expect(req.request.method).toBe('GET');
    req.flush(mockMembers);

    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.list.value)));
    expect(service.list.value()).toEqual(mockMembers);
  });

  it('should clear list when bar is cleared', async () => {
    service.setBarContext(asBarId('bar-1'));
    service.list.value();
    TestBed.flushEffects();
    const req = httpMock.expectOne('/bars/bar-1/members');
    req.flush([]);
    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.list.value)));

    service.clearBarContext();
    service.list.value();
    TestBed.flushEffects();
    expect(service.list.value()).toBeUndefined();
  });
});
