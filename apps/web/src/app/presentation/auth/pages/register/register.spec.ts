import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const authMock = { register: vi.fn() };

  const type = (testId: string, value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const fillIn = (name: string, email: string, password: string) => {
    type('name-input', name);
    type('email-input', email);
    type('password-input', password);
  };

  const submit = () =>
    (fixture.nativeElement.querySelector('[data-testid="register-btn"]') as HTMLButtonElement).click();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideTranslateService(), provideRouter([]), { provide: Auth, useValue: authMock }],
    }).compileComponents();

    vi.clearAllMocks();
    authMock.register.mockResolvedValue(undefined);

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should ask the browser to offer a new password, not the saved one', () => {
    const password = fixture.nativeElement.querySelector('[data-testid="password-input"]');

    expect(password.getAttribute('type')).toBe('password');
    expect(password.getAttribute('autocomplete')).toBe('new-password');
  });

  it('should offer a way back to signing in', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="login-link"]')).toBeTruthy();
  });

  it('should refuse a password shorter than eight characters', async () => {
    fillIn('Someone', 'someone@coaster.test', 'short');

    submit();
    await fixture.whenStable();

    expect(authMock.register).not.toHaveBeenCalled();
  });

  it('should refuse an address that is not an address', async () => {
    fillIn('Someone', 'not-an-address', 'a-good-enough-password');

    submit();
    await fixture.whenStable();

    expect(authMock.register).not.toHaveBeenCalled();
  });

  it('should refuse a form with no name', async () => {
    fillIn('', 'someone@coaster.test', 'a-good-enough-password');

    submit();
    await fixture.whenStable();

    expect(authMock.register).not.toHaveBeenCalled();
  });

  it('should open the account and go to the establishment picker', async () => {
    fillIn('Someone', 'someone@coaster.test', 'a-good-enough-password');

    submit();
    await fixture.whenStable();

    expect(authMock.register).toHaveBeenCalledWith({
      name: 'Someone',
      email: 'someone@coaster.test',
      password: 'a-good-enough-password',
    });
    expect(navigate).toHaveBeenCalledWith(['/establishments/select']);
  });

  it('should stay on the page and say so when the address is already taken', async () => {
    authMock.register.mockRejectedValue(new Error('USER_ALREADY_EXISTS'));
    fillIn('Someone', 'someone@coaster.test', 'a-good-enough-password');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
