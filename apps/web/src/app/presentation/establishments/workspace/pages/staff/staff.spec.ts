import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentRole } from '@coaster/common';
import { ManageMembers } from '@coaster/establishment-members';
import type { EstablishmentMember } from '@coaster/common';
import { fakeResource } from '@coaster/testing';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';

import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import Staff from './staff';

describe('Staff', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  let members = fakeResource<EstablishmentMember[]>([]);

  const membersStoreMock = {
    remove: vi.fn(),
    resendInvite: vi.fn(),
    updateRole: vi.fn(),
  };

  const canManageBilling = signal(true);
  const canInvite = signal(false);

  const myMemberStoreMock = {
    myMember: {
      value: signal(undefined),
      hasValue: signal(true),
    },
    isOwner: signal(false),
    hasPermission: vi.fn((permission: string) => {
      if (permission === 'establishment:manage-billing') return canManageBilling();
      if (permission === 'establishment:invite-member') return canInvite();
      return false;
    }),
  };

  const confirmationDialogMock = {
    confirm: vi.fn(),
  };

  const billedSeats = signal<
    | {
        used: number;
        billed: number;
        included: number;
        basePriceCents: number;
        extraPriceCents: number;
        extraSeats: number;
        monthlyTotalCents: number;
      }
    | undefined
  >(undefined);

  const subscriptionStoreMock = {
    isReadOnly: signal(false),
    reloadSeats: vi.fn(),
    billedSeats,
  };

  beforeEach(async () => {
    billedSeats.set(undefined);
    canManageBilling.set(true);
    canInvite.set(false);

    await TestBed.configureTestingModule({
      imports: [Staff],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ManageMembers, useValue: membersStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: ConfirmationDialog, useValue: confirmationDialogMock },
        { provide: EstablishmentSubscriptionStore, useValue: subscriptionStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    members = fakeResource<EstablishmentMember[]>([]);
    fixture = TestBed.createComponent(Staff);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.componentRef.setInput('members', members.resource);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the seat counter', () => {
    it('should say nothing until the seats are known', () => {
      expect(fixture.nativeElement.textContent).not.toContain('members.staff.seats_used');
    });

    it('should show the plan a venue inside its allowance is paying', async () => {
      billedSeats.set({
        used: 4,
        billed: 4,
        included: 10,
        basePriceCents: 1999,
        extraPriceCents: 200,
        extraSeats: 0,
        monthlyTotalCents: 1999,
      });
      await fixture.whenStable();

      expect(fixture.nativeElement.textContent).toContain('members.staff.seats_used');
      expect(fixture.nativeElement.textContent).toContain('members.staff.seats_within');
      expect(component['seats']()?.monthlyTotal).toBe('19,99\u00A0€');
    });

    it('should price the staff a venue has beyond the allowance', async () => {
      billedSeats.set({
        used: 14,
        billed: 14,
        included: 10,
        basePriceCents: 1999,
        extraPriceCents: 200,
        extraSeats: 4,
        monthlyTotalCents: 2799,
      });
      await fixture.whenStable();

      expect(fixture.nativeElement.textContent).toContain('members.staff.seats_over');
      expect(component['seats']()?.monthlyTotal).toBe('27,99\u00A0€');
    });
  });

  describe('establishmentId input', () => {
    it('should expose establishmentId with provided value', () => {
      expect(component.establishmentId()).toBe('establishment-1');
    });
  });

  describe('rendering', () => {
    it('should render section title', () => {
      fixture.detectChanges();
      const sectionTitle = fixture.nativeElement.querySelector('coaster-page-header');
      expect(sectionTitle).toBeTruthy();
    });
  });

  describe('computed properties', () => {
    it('should return 0 total members when list is empty', () => {
      expect(component['totalMembers']()).toBe(0);
    });

    it('should return empty members array when list is empty', () => {
      expect(component['memberItems']()).toEqual([]);
    });

    it('should return undefined userMember when no matching member', () => {
      expect(component['userMember']()).toBeUndefined();
    });

    it('should calculate members correctly with permissions', () => {
      members.resolve([{ id: 'm1', userId: 'u1', userName: 'Test User 1', role: EstablishmentRole.OWNER }] as any);
      myMemberStoreMock.myMember.hasValue.set(true);
      myMemberStoreMock.myMember.value.set({
        userId: 'u1',
        userName: 'Test User 1',
        role: EstablishmentRole.OWNER,
      } as any);
      myMemberStoreMock.isOwner.set(false);

      const items = component['memberItems']();
      expect(items.length).toBe(1);
      expect(items[0].isCurrentUser).toBe(true);
      expect(items[0].showDeleteButton).toBe(true);
    });
  });

  describe('interaction logic', () => {
    it('should handle modal close navigation', () => {
      const navigateSpy = vi.spyOn((component as any).router, 'navigate');
      (component as any).closeModal();
      expect(navigateSpy).toHaveBeenCalledWith(['/establishments', 'establishment-1', 'staff']);
    });

    it('should remove a member after confirmation', async () => {
      membersStoreMock.remove.mockResolvedValue(null);
      confirmationDialogMock.confirm.mockResolvedValue(true);

      await (component as any).handleClickDeleteMember({
        id: 'm1',
        userId: 'u1',
        userName: 'Test User',
        role: EstablishmentRole.STAFF,
        isCurrentUser: false,
      });

      expect(confirmationDialogMock.confirm).toHaveBeenCalled();
      expect(membersStoreMock.remove).toHaveBeenCalledWith('establishment-1', 'm1');
      expect(members.reload).toHaveBeenCalled();
    });
  });

  describe('the seat counter and who may see it', () => {
    it('should stay hidden from anyone who cannot manage billing, since it shows the monthly cost', async () => {
      canManageBilling.set(false);
      billedSeats.set({
        used: 4,
        billed: 4,
        included: 10,
        basePriceCents: 1999,
        extraPriceCents: 200,
        extraSeats: 0,
        monthlyTotalCents: 1999,
      });
      await fixture.whenStable();

      expect(component['seats']()).toBeUndefined();
      expect(fixture.nativeElement.textContent).not.toContain('members.staff.seats_used');
    });
  });
  describe('a pending invitation', () => {
    const listPendingMember = () => {
      members.resolve([
        {
          id: 'm2',
          userId: 'u2',
          userName: 'Invited',
          userEmail: 'invited@test.com',
          role: EstablishmentRole.STAFF,
          pending: true,
        },
      ] as any);
      myMemberStoreMock.myMember.hasValue.set(true);
      myMemberStoreMock.myMember.value.set({ userId: 'u1', role: EstablishmentRole.OWNER } as any);
    };

    it('should offer to resend it to whoever can invite', () => {
      canInvite.set(true);
      listPendingMember();

      const [member] = component['memberItems']();

      expect(member.isPending).toBe(true);
      expect(member.canResendInvite).toBe(true);
    });

    it('should not offer it to somebody who cannot invite', () => {
      canInvite.set(false);
      listPendingMember();

      expect(component['memberItems']()[0].canResendInvite).toBe(false);
    });

    it('should send it again', async () => {
      membersStoreMock.resendInvite.mockResolvedValue(undefined);

      await (component as any).handleResendInvite({
        id: 'm2',
        userEmail: 'invited@test.com',
      });

      expect(membersStoreMock.resendInvite).toHaveBeenCalledWith('establishment-1', 'm2');
    });
  });
});
