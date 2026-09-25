import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AccountSession, AccountSummary } from '@coaster/common';
import { AccountRepository, Toast } from '@coaster/core';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../components/confirm-dialog/confirmation-dialog.service';
import Account from './account';

const summary = (overrides: Partial<AccountSummary> = {}): AccountSummary => ({
  email: 'alguien@coaster.test',
  name: 'Alguien',
  emailVerified: true,
  hasPassword: true,
  identities: [{ provider: 'GOOGLE', email: 'alguien@coaster.test', linkedAt: '2026-01-01T00:00:00.000Z' }],
  ...overrides,
});

const CHROME_ON_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const SAFARI_ON_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const session = (overrides: Partial<AccountSession> = {}): AccountSession => ({
  id: 'session-1',
  current: false,
  userAgent: CHROME_ON_WINDOWS,
  ip: '10.0.0.1',
  createdAt: '2026-09-20T10:00:00.000Z',
  lastUsedAt: '2026-09-20T10:00:00.000Z',
  expiresAt: '2026-10-20T10:00:00.000Z',
  ...overrides,
});

describe('Account', () => {
  let fixture: ComponentFixture<Account>;

  let account = fakeResource(summary());
  let sessions = fakeResource<AccountSession[]>([]);

  const repo = {
    requestEmailVerification: vi.fn(),
    setPassword: vi.fn(),
    unlink: vi.fn(),
    closeSession: vi.fn(),
    closeOtherSessions: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  const confirmation = { confirm: vi.fn() };

  const render = async () => {
    fixture = TestBed.createComponent(Account);
    fixture.componentRef.setInput('account', account.resource);
    fixture.componentRef.setInput('sessions', sessions.resource);
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
    account = fakeResource(summary());
    repo.requestEmailVerification.mockResolvedValue(undefined);
    repo.setPassword.mockResolvedValue(undefined);
    repo.unlink.mockResolvedValue(undefined);
    sessions = fakeResource([session({ id: 'this-one', current: true }), session({ id: 'the-phone' })]);
    repo.closeSession.mockResolvedValue(undefined);
    repo.closeOtherSessions.mockResolvedValue(undefined);
    confirmation.confirm.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: AccountRepository, useValue: repo },
        { provide: Toast, useValue: toast },
        { provide: ConfirmationDialog, useValue: confirmation },
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
      account = fakeResource(summary({ emailVerified: false }));

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
      account = fakeResource(summary({ hasPassword: false }));

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
      expect(account.reload).toHaveBeenCalled();
    });

    it('should refuse to offer unlinking when it is the only way in', async () => {
      account = fakeResource(summary({ hasPassword: false }));

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
      account = fakeResource(summary({ identities: [] }));

      await render();

      expect(at('no-identities')).toBeTruthy();
    });
  });

  describe('the open sessions', () => {
    it('should name the device behind each one and flag the one being used', async () => {
      await render();

      expect(at('session-this-one').textContent).toContain('Chrome · Windows');
      expect(at('session-current-this-one')).toBeTruthy();
      expect(at('session-current-the-phone')).toBeFalsy();
    });

    it('should not offer to close the session doing the asking', async () => {
      await render();

      expect(at('close-session-this-one')).toBeFalsy();
      expect(at('close-session-the-phone')).toBeTruthy();
    });

    it('should close one after asking first, and show what is left', async () => {
      await render();

      at('close-session-the-phone').click();
      await fixture.whenStable();

      expect(confirmation.confirm).toHaveBeenCalled();
      expect(repo.closeSession).toHaveBeenCalledWith('the-phone');
      expect(sessions.reload).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('account.sessions.closed');
    });

    it('should leave the session alone when the question is answered no', async () => {
      confirmation.confirm.mockResolvedValue(false);

      await render();
      at('close-session-the-phone').click();
      await fixture.whenStable();

      expect(repo.closeSession).not.toHaveBeenCalled();
    });

    it('should close every other session at once', async () => {
      await render();

      at('close-others-btn').click();
      await fixture.whenStable();

      expect(repo.closeOtherSessions).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('account.sessions.others_closed');
    });

    it('should not offer to close the others when there are none', async () => {
      sessions = fakeResource<AccountSession[]>([session({ id: 'this-one', current: true })]);

      await render();

      expect(at('close-others-btn')).toBeFalsy();
    });

    it('should say what went wrong instead of pretending the session closed', async () => {
      repo.closeSession.mockRejectedValue(new Error('SESSION_NOT_FOUND'));

      await render();
      at('close-session-the-phone').click();
      await fixture.whenStable();

      expect(toast.error).toHaveBeenCalledWith('SESSION_NOT_FOUND');
    });

    it('should tell a device apart even when nothing is known about it', async () => {
      sessions = fakeResource<AccountSession[]>([session({ id: 'odd-one', userAgent: null, ip: null })]);

      await render();

      expect(at('session-odd-one').textContent).toContain('account.sessions.unknown_device');
    });

    it('should recognise a phone as a phone', async () => {
      sessions = fakeResource<AccountSession[]>([session({ id: 'the-phone', userAgent: SAFARI_ON_IPHONE })]);

      await render();

      expect(at('session-the-phone').textContent).toContain('Safari · iPhone');
      expect(at('session-the-phone').querySelector('mat-icon').textContent).toContain('smartphone');
    });

    it('should say plainly when there is nothing open', async () => {
      sessions = fakeResource<AccountSession[]>([]);

      await render();

      expect(at('no-sessions')).toBeTruthy();
    });
  });
});
