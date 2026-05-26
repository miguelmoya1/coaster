import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { MembersStore } from '@coaster/members';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Staff from './staff';

describe('Staff', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    isOnlyOwner: vi.fn().mockReturnValue(false),
    setBarId: vi.fn(),
    remove: vi.fn(),
  };

  const barsStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue(undefined),
    },
    isOwner: signal(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staff],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: BarsStore, useValue: barsStoreMock },
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

    it('should return undefined userMember when no matching member', () => {
      expect(component['userMember']()).toBeUndefined();
    });
  });
});
