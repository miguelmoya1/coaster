import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth, AuthRepository, GoogleSignIn } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Invite from './invite';

describe('Invite', () => {
  let fixture: ComponentFixture<Invite>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const repo = { invite: vi.fn() };
  const auth = { acceptInvite: vi.fn(), loginWithGoogle: vi.fn() };
  const google = { available: signal(false).asReadonly(), renderButton: vi.fn() };

  const render = async () => {
    fixture = TestBed.createComponent(Invite);
    fixture.componentRef.setInput('token', 'una-invitacion');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const type = (value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="password-input"]');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const submit = () => (fixture.nativeElement.querySelector('[data-testid="invite-btn"]') as HTMLButtonElement).click();

  beforeEach(async () => {
    vi.clearAllMocks();
    repo.invite.mockResolvedValue({ email: 'invitada@coaster.test', name: 'Invitada', hasCredentials: false });
    auth.acceptInvite.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Invite],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: AuthRepository, useValue: repo },
        { provide: Auth, useValue: auth },
        { provide: GoogleSignIn, useValue: google },
      ],
    }).compileComponents();
  });

  it('should show whose invitation it is and ask for a password', async () => {
    await render();

    expect(repo.invite).toHaveBeenCalledWith('una-invitacion');
    expect(fixture.nativeElement.textContent).toContain('invitada@coaster.test');
    expect(fixture.nativeElement.querySelector('[data-testid="password-input"]')).toBeTruthy();
  });

  it('should send somebody who already has an account to sign in as usual', async () => {
    repo.invite.mockResolvedValue({ email: 'invitada@coaster.test', name: 'Invitada', hasCredentials: true });

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="invite-already"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="password-input"]')).toBeFalsy();
  });

  it('should say so when the invitation has expired, instead of showing an empty form', async () => {
    repo.invite.mockRejectedValue(new Error('INVALID_TOKEN'));

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="invite-failed"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="password-input"]')).toBeFalsy();
  });

  it('should refuse a password shorter than eight characters', async () => {
    await render();
    type('corta');

    submit();
    await fixture.whenStable();

    expect(auth.acceptInvite).not.toHaveBeenCalled();
  });

  it('should claim the invitation and go on into the app', async () => {
    await render();
    type('una-contrasena-buena');

    submit();
    await fixture.whenStable();

    expect(auth.acceptInvite).toHaveBeenCalledWith('una-invitacion', 'una-contrasena-buena');
    expect(navigate).toHaveBeenCalledWith(['/establishments/select']);
  });

  it('should stay put and say why when the invitation is refused', async () => {
    auth.acceptInvite.mockRejectedValue(new Error('INVALID_TOKEN'));
    await render();
    type('una-contrasena-buena');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
