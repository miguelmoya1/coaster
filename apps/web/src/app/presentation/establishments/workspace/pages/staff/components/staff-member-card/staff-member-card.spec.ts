import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { StaffMemberCard } from './staff-member-card';

describe('StaffMemberCard', () => {
  let component: StaffMemberCard;
  let fixture: ComponentFixture<StaffMemberCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberCard],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('staffName', 'John Doe');
    fixture.componentRef.setInput('staffImage', 'http://img.com/john.jpg');
    fixture.componentRef.setInput('staffEmail', 'john@test.com');
    fixture.componentRef.setInput('roleName', 'Bartender');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the staff name and role', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('John Doe');
      expect(element.textContent).toContain('common.role.bartender');
    });

    it('should have a mailto link with the correct email', () => {
      const link = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('href')).toBe('mailto:john@test.com');
    });
  });

  describe('states', () => {
    it('should apply disabled styles and attributes when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.componentRef.setInput('showDeleteButton', true);
      fixture.detectChanges();

      const hostElement: HTMLElement = fixture.nativeElement;
      expect(hostElement.classList.contains('opacity-50')).toBe(true);
      expect(hostElement.getAttribute('aria-disabled')).toBe('true');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);

      const link = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('href')).toBeNull();
      expect(link.classList.contains('pointer-events-none')).toBe(true);
    });
  });

  describe('a pending invitation', () => {
    it('should say nothing about it when the member already signed in', () => {
      expect(fixture.nativeElement.textContent).not.toContain('members.pending_invite');
      expect(fixture.nativeElement.querySelector('[title="members.resend_invite.action"]')).toBeNull();
    });

    it('should flag it and offer to send it again', () => {
      fixture.componentRef.setInput('isPending', true);
      fixture.componentRef.setInput('canResendInvite', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('members.pending_invite');
      expect(fixture.nativeElement.querySelector('[title="members.resend_invite.action"]')).toBeTruthy();
    });

    it('should emit resendInviteClicked when the button is pressed', () => {
      fixture.componentRef.setInput('isPending', true);
      fixture.componentRef.setInput('canResendInvite', true);
      fixture.detectChanges();

      let emitted = 0;
      component.resendInviteClicked.subscribe(() => (emitted += 1));

      fixture.nativeElement.querySelector('[title="members.resend_invite.action"]').click();

      expect(emitted).toBe(1);
    });

    it('should hold the button while the invitation is on its way', () => {
      fixture.componentRef.setInput('isPending', true);
      fixture.componentRef.setInput('canResendInvite', true);
      fixture.componentRef.setInput('resendingInvite', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[title="members.resend_invite.action"]');
      expect(button.disabled).toBe(true);
    });
  });
});
