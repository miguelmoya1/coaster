import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Realtime } from '@coaster/core';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { MyMemberStore } from '@coaster/establishment-members';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  const canManageBilling = signal(true);
  const extraSeatNotice = signal<
    { used: number; billed: number; included: number; basePriceCents: number; extraPriceCents: number } | undefined
  >(undefined);

  beforeEach(async () => {
    extraSeatNotice.set(undefined);
    canManageBilling.set(true);

    await TestBed.configureTestingModule({
      imports: [InviteMemberForm],
      providers: [
        provideTranslateService(),
        { provide: EstablishmentSubscriptionStore, useValue: { extraSeatNotice } },
        { provide: MyMemberStore, useValue: { hasPermission: () => canManageBilling() } },
        {
          provide: Realtime,
          useValue: {
            memberRemoved: signal<any>(null),
            memberInvited: signal<any>(null),
            memberRoleChanged: signal<any>(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the role picker', () => {
    const select = (): HTMLSelectElement => fixture.nativeElement.querySelector('select');

    it('should offer the three roles in one native select, like every other form in the app', () => {
      const options = Array.from(select().options).map((option) => option.value);

      expect(options).toEqual(['OWNER', 'MANAGER', 'STAFF']);
    });

    it('should start on staff, the least dangerous role to hand out by accident', () => {
      expect(select().value).toBe('STAFF');
    });

    it('should be styled by coasterInput, which is what makes it match the rest of the app', () => {
      expect(select().classList.contains('coaster-input')).toBe(true);
    });

    it('should follow the picked role and explain what it can do', async () => {
      const element = select();
      element.value = 'MANAGER';
      element.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(component['selectedRole']()).toBe('MANAGER');
      expect(fixture.nativeElement.textContent).toContain('members.invite.role_hint_manager');
    });
  });

  describe('the seat that costs extra', () => {
    it('should say nothing while the venue still has room in its allowance', () => {
      expect(fixture.nativeElement.textContent).not.toContain('extra_seat');
    });

    it('should warn before inviting the employee that goes over the allowance', () => {
      extraSeatNotice.set({ used: 10, billed: 10, included: 10, basePriceCents: 1999, extraPriceCents: 200 });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('members.invite.extra_seat');
    });
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      const cancelButton = buttons.find((button) => button.textContent?.trim().toLowerCase().includes('cancel'))!;

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('who gets told about the money', () => {
    const overAllowance = { used: 10, billed: 10, included: 10, basePriceCents: 1999, extraPriceCents: 200 };

    it('should not tell a manager what the hire costs, since they cannot pay it', () => {
      canManageBilling.set(false);
      extraSeatNotice.set(overAllowance);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('members.invite.extra_seat');
    });

    it('should still tell the owner, who is the one billed for it', () => {
      canManageBilling.set(true);
      extraSeatNotice.set(overAllowance);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('members.invite.extra_seat');
    });
  });
});
