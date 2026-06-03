import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { Bar } from '@coaster/common';
import { asBarId, Role } from '@coaster/core';
import { CurrentUser } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectBar from './select-bar';

describe('SelectBar', () => {
  let component: SelectBar;
  let fixture: ComponentFixture<SelectBar>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const mockBars: Bar[] = [
    {
      id: asBarId('bar-1'),
      name: 'The Rusty Anchor',
    },
  ];

  const barsStoreMock = {
    list: {
      value: vi.fn().mockReturnValue(mockBars),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
  };

  const currentUserMock = {
    current: {
      value: vi.fn().mockReturnValue({ role: Role.USER }),
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBar],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: CurrentUser, useValue: currentUserMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(SelectBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show section title', () => {
      const sectionTitle = fixture.nativeElement.querySelector('coaster-section-title');
      expect(sectionTitle).toBeTruthy();
    });

    it('should render bar cards for each bar', () => {
      const cards = fixture.nativeElement.querySelectorAll('coaster-bar-card');
      expect(cards.length).toBe(1);
    });

    it('should render create button', () => {
      const button = fixture.nativeElement.querySelector('button[coaster-btn]');
      expect(button).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should navigate to create bar on button click', () => {
      component.navigateToCreate();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/create']);
    });

    it('should navigate to bar dashboard on selection', () => {
      component.selectBar('bar-1');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars', 'bar-1', 'dashboard']);
    });
  });
});
