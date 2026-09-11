import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthRepository } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmail from './verify-email';

describe('VerifyEmail', () => {
  let fixture: ComponentFixture<VerifyEmail>;

  const repo = { verifyEmail: vi.fn() };

  const render = async () => {
    fixture = TestBed.createComponent(VerifyEmail);
    fixture.componentRef.setInput('token', 'un-token');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    repo.verifyEmail.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [provideTranslateService(), provideRouter([]), { provide: AuthRepository, useValue: repo }],
    }).compileComponents();
  });

  it('should confirm the address on its own, without asking for a click', async () => {
    await render();

    expect(repo.verifyEmail).toHaveBeenCalledWith('un-token');
    expect(fixture.nativeElement.querySelector('[data-testid="verify-done"]')).toBeTruthy();
  });

  it('should say what went wrong when the link is spent or expired', async () => {
    repo.verifyEmail.mockRejectedValue(new Error('INVALID_TOKEN'));

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="verify-failed"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="verify-done"]')).toBeFalsy();
  });

  it('should offer a way onwards either way', async () => {
    repo.verifyEmail.mockRejectedValue(new Error('INVALID_TOKEN'));

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="continue-btn"]')).toBeTruthy();
  });
});
