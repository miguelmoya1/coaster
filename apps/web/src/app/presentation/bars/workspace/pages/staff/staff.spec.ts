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
      value: signal([]),
      hasValue: signal(false),
      isLoading: signal(false),
    },
    isOnlyOwner: vi.fn().mockReturnValue(false),
    setBarId: vi.fn(),
    remove: vi.fn(),
  };

  const barsStoreMock = {
    myMember: {
      value: signal(undefined),
      hasValue: signal(true),
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
      const sectionTitle = fixture.nativeElement.querySelector('.heading-2');
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

    it('should calculate members correctly with permissions', () => {
      membersStoreMock.list.hasValue.set(true);
      membersStoreMock.list.value.set([
        { id: 'm1', userId: 'u1', userName: 'Test User 1', role: 'OWNER' }
      ] as any);
      barsStoreMock.myMember.hasValue.set(true);
      barsStoreMock.myMember.value.set({ userId: 'u1', userName: 'Test User 1', role: 'OWNER' } as any);
      barsStoreMock.isOwner.set(false);
      membersStoreMock.isOnlyOwner.mockReturnValue(false);

      const members = component['members']();
      expect(members.length).toBe(1);
      expect(members[0].isCurrentUser).toBe(true);
      expect(members[0].showDeleteButton).toBe(true);
    });
  });

  describe('interaction logic', () => {
    it('should handle modal close navigation', () => {
      const navigateSpy = vi.spyOn((component as any).router, 'navigate');
      (component as any).closeModal();
      expect(navigateSpy).toHaveBeenCalledWith(['/bars', 'bar-1', 'staff']);
    });

    it('should handle confirm delete member', async () => {
      membersStoreMock.remove.mockResolvedValue(null);
      (component as any).memberDeleting.set({ id: 'm1' });
      await (component as any).handleConfirmDeleteMember();
      expect(membersStoreMock.remove).toHaveBeenCalledWith('m1');
    });
  });
});
