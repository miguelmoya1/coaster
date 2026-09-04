import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Realtime } from '@coaster/core';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  const extraSeatNotice = signal<
    { used: number; billed: number; included: number; basePriceCents: number; extraPriceCents: number } | undefined
  >(undefined);

  beforeEach(async () => {
    extraSeatNotice.set(undefined);

    await TestBed.configureTestingModule({
      imports: [InviteMemberForm],
      providers: [
        provideTranslateService(),
        { provide: EstablishmentSubscriptionStore, useValue: { extraSeatNotice } },
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
});
