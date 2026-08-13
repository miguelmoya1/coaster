import { asEstablishmentId } from '@coaster/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EstablishmentListStore } from '@coaster/establishments';
import type { Establishment } from '@coaster/common';
import { Role } from '@coaster/common';
import { CurrentUser } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectEstablishment from './select-establishment';

describe('SelectEstablishment', () => {
  let component: SelectEstablishment;
  let fixture: ComponentFixture<SelectEstablishment>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const mockEstablishments: Establishment[] = [
    {
      id: asEstablishmentId('establishment-1'),
      name: 'The Rusty Anchor',
    },
  ];

  const establishmentListStoreMock = {
    list: {
      value: vi.fn().mockReturnValue(mockEstablishments),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
  };

  const currentUserMock = {
    current: {
      value: vi.fn().mockReturnValue({ role: Role.USER }),
    },
    isAdmin: signal(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectEstablishment],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: EstablishmentListStore, useValue: establishmentListStoreMock },
        { provide: CurrentUser, useValue: currentUserMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(SelectEstablishment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show section title', () => {
      const sectionTitle = fixture.nativeElement.querySelector('.heading-1');
      expect(sectionTitle).toBeTruthy();
    });

    it('should render establishment cards for each establishment', () => {
      const cards = fixture.nativeElement.querySelectorAll('coaster-establishment-card');
      expect(cards.length).toBe(1);
    });

    it('should render create button', () => {
      const button = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(button).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should navigate to create establishment on button click', () => {
      component.navigateToCreate();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/establishments/create']);
    });

    it('should navigate to establishment dashboard on selection', () => {
      component.selectEstablishment('establishment-1');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/establishments', 'establishment-1', 'dashboard']);
    });
  });
});
