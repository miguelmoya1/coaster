import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarsStore } from '../../../../bars';
import { CurrentUser, Socket } from '../../../../core';
import { MembersStore } from '../../../../members';
import WorkspaceLayout from './workspace-layout';

describe('WorkspaceLayout', () => {
  let component: WorkspaceLayout;
  let fixture: ComponentFixture<WorkspaceLayout>;

  const currentUserMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ id: 'u-1', name: 'Test User', photoUrl: '' }),
    },
  };

  const barsStoreMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ name: 'Test Bar' }),
    },
    setBarId: vi.fn(),
  };

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      hasValue: vi.fn().mockReturnValue(true),
      isLoading: vi.fn().mockReturnValue(false),
    },
    setBarId: vi.fn(),
  };

  const socketMock = {
    joinBar: vi.fn(),
    leaveBar: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: Socket, useValue: socketMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('barId input', () => {
    it('should expose barId with provided value', () => {
      expect(component.barId()).toBe('bar-1');
    });
  });

  describe('rendering', () => {
    it('should render top app bar when user has value', () => {
      fixture.detectChanges();
      const topBar = fixture.nativeElement.querySelector('coaster-top-app-bar');
      expect(topBar).toBeTruthy();
    });

    it('should render router outlet', () => {
      fixture.detectChanges();
      const outlet = fixture.nativeElement.querySelector('router-outlet');
      expect(outlet).toBeTruthy();
    });

    it('should render bottom nav', () => {
      fixture.detectChanges();
      const bottomNav = fixture.nativeElement.querySelector('coaster-bottom-nav');
      expect(bottomNav).toBeTruthy();
    });
  });
});
