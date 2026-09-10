import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const authMock = { login: vi.fn() };
  let navigate: ReturnType<typeof vi.spyOn>;

  const type = (testId: string, value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const fillIn = (email: string, password: string) => {
    type('email-input', email);
    type('password-input', password);
  };

  const submit = () => (fixture.nativeElement.querySelector('[data-testid="login-btn"]') as HTMLButtonElement).click();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideTranslateService(), provideRouter([]), { provide: Auth, useValue: authMock }],
    }).compileComponents();

    vi.clearAllMocks();
    authMock.login.mockResolvedValue(undefined);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show the card with an email and a password field', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="login-card"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="email-input"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="password-input"]')).toBeTruthy();
    });

    it('should offer a way to create an account', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="register-link"]')).toBeTruthy();
    });

    it('should ask the browser for the saved password rather than a new one', () => {
      const password = fixture.nativeElement.querySelector('[data-testid="password-input"]');

      expect(password.getAttribute('type')).toBe('password');
      expect(password.getAttribute('autocomplete')).toBe('current-password');
    });
  });

  describe('submitting', () => {
    it('should refuse to send an empty form', async () => {
      submit();
      await fixture.whenStable();

      expect(authMock.login).not.toHaveBeenCalled();
    });

    it('should refuse an address that is not an address', async () => {
      fillIn('not-an-address', 'a-good-enough-password');

      submit();
      await fixture.whenStable();

      expect(authMock.login).not.toHaveBeenCalled();
    });

    it('should sign in and go to the establishment picker', async () => {
      fillIn('someone@coaster.test', 'a-good-enough-password');

      submit();
      await fixture.whenStable();

      expect(authMock.login).toHaveBeenCalledWith({
        email: 'someone@coaster.test',
        password: 'a-good-enough-password',
      });
      expect(navigate).toHaveBeenCalledWith(['/establishments/select']);
    });

    it('should stay on the page and say so when the credentials are refused', async () => {
      authMock.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
      fillIn('someone@coaster.test', 'not-the-password');

      submit();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(navigate).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });
  });
});
