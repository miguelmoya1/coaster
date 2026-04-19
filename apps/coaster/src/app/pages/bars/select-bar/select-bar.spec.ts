import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { MyBars } from '../../../bars';
import SelectBar from './select-bar';

describe('SelectBar', () => {
  let component: SelectBar;
  let fixture: ComponentFixture<SelectBar>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const mockBars: BarMember[] = [
    {
      id: asBarMemberId('mb-1'),
      barId: asBarId('bar-1'),
      userId: asUserId('u-1'),
      userName: 'User',
      userEmail: 'u@test.com',
      userImage: '',
      role: BarRole.OWNER,
      active: true,
    },
  ];

  const myBarsMock = {
    all: {
      value: vi.fn().mockReturnValue(mockBars),
      isLoading: vi.fn().mockReturnValue(false),
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: MyBars, useValue: myBarsMock },
      ],
    }).compileComponents();

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
