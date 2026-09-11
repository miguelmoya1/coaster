import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth, GoogleSignIn } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleButton } from './google-button';

describe('GoogleButton', () => {
  let fixture: ComponentFixture<GoogleButton>;

  const available = signal(true);
  let onCredential: ((credential: string) => void) | null = null;

  const googleMock = {
    available: available.asReadonly(),
    renderButton: vi.fn(async (_host: HTMLElement, callback: (credential: string) => void) => {
      onCredential = callback;
    }),
  };

  const authMock = { loginWithGoogle: vi.fn() };

  const build = async () => {
    fixture = TestBed.createComponent(GoogleButton);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    onCredential = null;
    available.set(true);
    authMock.loginWithGoogle.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [GoogleButton],
      providers: [
        provideTranslateService(),
        { provide: GoogleSignIn, useValue: googleMock },
        { provide: Auth, useValue: authMock },
      ],
    }).compileComponents();
  });

  it('should ask Google to draw its button', async () => {
    await build();

    expect(googleMock.renderButton).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="google-button"]')).toBeTruthy();
  });

  it('should draw no Google button when there is no client id', async () => {
    available.set(false);

    await build();

    expect(fixture.nativeElement.querySelector('[data-testid="google-button"]')).toBeFalsy();
    expect(googleMock.renderButton).not.toHaveBeenCalled();
  });

  it('should say why the button is missing rather than leave a hole, outside production', async () => {
    available.set(false);

    await build();

    expect(fixture.nativeElement.querySelector('[data-testid="google-button-unconfigured"]')).toBeTruthy();
  });

  it('should sign in with the credential Google hands back', async () => {
    await build();
    const signedIn = vi.fn();
    fixture.componentInstance.signedIn.subscribe(signedIn);

    onCredential!('a-google-credential');
    await fixture.whenStable();

    expect(authMock.loginWithGoogle).toHaveBeenCalledWith('a-google-credential');
    expect(signedIn).toHaveBeenCalled();
  });

  it('should say what went wrong and stay put when the API refuses the credential', async () => {
    authMock.loginWithGoogle.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    await build();
    const signedIn = vi.fn();
    fixture.componentInstance.signedIn.subscribe(signedIn);

    onCredential!('a-google-credential');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(signedIn).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
