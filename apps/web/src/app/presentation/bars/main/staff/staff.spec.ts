import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUser } from '../../../../core';
import { BarMembers, InviteMember, RemoveMember } from '../../../../members';
import Staff from './staff';

describe('Staff', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  const barMembersMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    reload: vi.fn(),
  };

  const currentUserMock = {
    current: {
      value: vi.fn().mockReturnValue({ id: 'u-1' }),
      hasValue: vi.fn().mockReturnValue(true),
    },
  };

  const inviteMemberMock = {
    invite: vi.fn(),
  };

  const removeMemberMock = {
    remove: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staff],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: BarMembers, useValue: barMembersMock },
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: InviteMember, useValue: inviteMemberMock },
        { provide: RemoveMember, useValue: removeMemberMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Staff);
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
    it('should render section title', () => {
      fixture.detectChanges();
      const sectionTitle = fixture.nativeElement.querySelector('coaster-section-title');
      expect(sectionTitle).toBeTruthy();
    });
  });

  describe('computed properties', () => {
    it('should return 0 total members when list is empty', () => {
      expect(component['totalMembers']()).toBe(0);
    });

    it('should return empty members array when list is empty', () => {
      expect(component['members']()).toEqual([]);
    });

    it('should return undefined currentUserRole when no matching member', () => {
      expect(component['currentUserRole']()).toBeUndefined();
    });
  });
});
