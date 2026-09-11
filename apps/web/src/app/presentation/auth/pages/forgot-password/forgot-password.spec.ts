import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthRepository } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './forgot-password';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;

  const repo = { forgotPassword: vi.fn() };

  const type = (value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="email-input"]');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const submit = () => (fixture.nativeElement.querySelector('[data-testid="forgot-btn"]') as HTMLButtonElement).click();

  beforeEach(async () => {
    vi.clearAllMocks();
    repo.forgotPassword.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideTranslateService(), provideRouter([]), { provide: AuthRepository, useValue: repo }],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
  });

  it('should ask for the address', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="email-input"]')).toBeTruthy();
  });

  it('should refuse to send something that is not an address', async () => {
    type('no-es-una-direccion');

    submit();
    await fixture.whenStable();

    expect(repo.forgotPassword).not.toHaveBeenCalled();
  });

  it('should send the link and then say so without revealing whether the account exists', async () => {
    type('alguien@coaster.test');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repo.forgotPassword).toHaveBeenCalledWith('alguien@coaster.test');
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-sent"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="email-input"]')).toBeFalsy();
  });

  it('should stay on the form when the request fails', async () => {
    repo.forgotPassword.mockRejectedValue(new Error('NETWORK_ERROR'));
    type('alguien@coaster.test');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="forgot-sent"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
