import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { User } from '@coaster/common';
import { AccountRepository, Auth, Toast } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyEmailBanner } from './verify-email-banner';

describe('VerifyEmailBanner', () => {
  let fixture: ComponentFixture<VerifyEmailBanner>;

  const isAuthenticated = signal(true);
  const currentUser = signal<Partial<User> | null>({ emailVerified: false });

  const auth = { isAuthenticated: isAuthenticated.asReadonly(), currentUser: currentUser.asReadonly() };
  const repo = { requestEmailVerification: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };

  const banner = () => fixture.nativeElement.querySelector('[data-testid="verify-email-banner"]');

  const render = () => {
    fixture = TestBed.createComponent(VerifyEmailBanner);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    isAuthenticated.set(true);
    currentUser.set({ emailVerified: false });
    repo.requestEmailVerification.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [VerifyEmailBanner],
      providers: [
        provideTranslateService(),
        { provide: Auth, useValue: auth },
        { provide: AccountRepository, useValue: repo },
        { provide: Toast, useValue: toast },
      ],
    }).compileComponents();
  });

  it('should nag somebody who has not confirmed their address', () => {
    render();

    expect(banner()).toBeTruthy();
  });

  it('should stay out of the way once the address is confirmed', () => {
    currentUser.set({ emailVerified: true });

    render();

    expect(banner()).toBeFalsy();
  });

  it('should show nothing to somebody who is not signed in', () => {
    isAuthenticated.set(false);

    render();

    expect(banner()).toBeFalsy();
  });

  it('should send the link and then get out of the way', async () => {
    render();

    fixture.nativeElement.querySelector('[data-testid="verify-email-banner-btn"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repo.requestEmailVerification).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('account.email.sent');
    expect(banner()).toBeFalsy();
  });
});
