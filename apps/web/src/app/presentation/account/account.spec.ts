import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AccountSummary } from '@coaster/common';
import { AccountRepository, Toast } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Account from './account';

const summary = (overrides: Partial<AccountSummary> = {}): AccountSummary => ({
  email: 'alguien@coaster.test',
  name: 'Alguien',
  emailVerified: true,
  hasPassword: true,
  identities: [{ provider: 'GOOGLE', email: 'alguien@coaster.test', linkedAt: '2026-01-01T00:00:00.000Z' }],
  ...overrides,
});

describe('Account', () => {
  let fixture: ComponentFixture<Account>;

  const repo = {
    account: vi.fn(),
    requestEmailVerification: vi.fn(),
    setPassword: vi.fn(),
    unlink: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };

  const render = async () => {
    fixture = TestBed.createComponent(Account);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const at = (testId: string) => fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const type = (testId: string, value: string) => {
    const input: HTMLInputElement = at(testId);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    repo.account.mockResolvedValue(summary());
    repo.requestEmailVerification.mockResolvedValue(undefined);
    repo.setPassword.mockResolvedValue(undefined);
    repo.unlink.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: AccountRepository, useValue: repo },
        { provide: Toast, useValue: toast },
      ],
    }).compileComponents();
  });

  describe('the address', () => {
    it('should show it as confirmed, with nothing to do', async () => {
      await render();

      expect(at('account-email').textContent).toContain('alguien@coaster.test');
      expect(at('email-verified')).toBeTruthy();
      expect(at('verify-btn')).toBeFalsy();
    });

    it('should offer to send the link when it is not confirmed', async () => {
      repo.account.mockResolvedValue(summary({ emailVerified: false }));

      await render();
      at('verify-btn').click();
      await fixture.whenStable();

      expect(repo.requestEmailVerification).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('account.email.sent');
    });
  });

  describe('the password', () => {
    it('should ask for the current one when there is one', async () => {
      await render();

      expect(at('current-password-input')).toBeTruthy();

      type('current-password-input', 'la-de-siempre');
      type('new-password-input', 'una-nueva-buena');
      at('password-btn').click();
      await fixture.whenStable();

      expect(repo.setPassword).toHaveBeenCalledWith('una-nueva-buena', 'la-de-siempre');
    });

    it('should not let the form be sent without the current one, rather than let the API refuse it', async () => {
      await render();

      type('new-password-input', 'una-nueva-buena');

      expect(at('password-btn').disabled).toBe(true);

      at('password-btn').click();
      await fixture.whenStable();

      expect(repo.setPassword).not.toHaveBeenCalled();
    });

    it('should tell the browser which account the password belongs to', async () => {
      await render();

      expect(at('username-hint').value).toBe('alguien@coaster.test');
    });

    it('should leave the form clean after saving, with no error where the success was', async () => {
      await render();

      type('current-password-input', 'la-de-siempre');
      type('new-password-input', 'una-nueva-buena');
      at('password-btn').click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(at('new-password-input').value).toBe('');
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeFalsy();
    });

    it('should ask for nothing else when there is none yet', async () => {
      repo.account.mockResolvedValue(summary({ hasPassword: false }));

      await render();

      expect(at('current-password-input')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('account.password.none_yet');

      type('new-password-input', 'una-nueva-buena');
      at('password-btn').click();
      await fixture.whenStable();

      expect(repo.setPassword).toHaveBeenCalledWith('una-nueva-buena', undefined);
    });

    it('should offer to reveal what is typed in every password field', async () => {
      await render();

      expect(fixture.nativeElement.querySelectorAll('[data-testid="password-reveal-btn"]')).toHaveLength(2);
    });

    it('should refuse one shorter than eight characters', async () => {
      await render();

      type('new-password-input', 'corta');
      at('password-btn').click();
      await fixture.whenStable();

      expect(repo.setPassword).not.toHaveBeenCalled();
    });

    it('should say what went wrong when the current password does not match', async () => {
      repo.setPassword.mockRejectedValue(new Error('INVALID_CREDENTIALS'));

      await render();
      type('current-password-input', 'la-equivocada');
      type('new-password-input', 'una-nueva-buena');
      at('password-btn').click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });
  });

  describe('linked accounts', () => {
    it('should list them and let them go', async () => {
      await render();

      expect(at('identity-GOOGLE')).toBeTruthy();

      at('unlink-GOOGLE').click();
      await fixture.whenStable();

      expect(repo.unlink).toHaveBeenCalledWith('GOOGLE');
      expect(repo.account).toHaveBeenCalledTimes(2);
    });

    it('should refuse to offer unlinking when it is the only way in', async () => {
      repo.account.mockResolvedValue(summary({ hasPassword: false }));

      await render();

      expect(at('unlink-GOOGLE').disabled).toBe(true);
      expect(at('only-way-in')).toBeTruthy();
    });

    it('should offer it once there is a password to fall back on', async () => {
      await render();

      expect(at('unlink-GOOGLE').disabled).toBe(false);
      expect(at('only-way-in')).toBeFalsy();
    });

    it('should say plainly when there are none', async () => {
      repo.account.mockResolvedValue(summary({ identities: [] }));

      await render();

      expect(at('no-identities')).toBeTruthy();
    });
  });
});
