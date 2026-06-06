import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const authMock = {
    loginWithGoogle: vi.fn().mockResolvedValue({}),
  };
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show section title', () => {
      const sectionTitle = fixture.nativeElement.querySelector('.heading-1');
      expect(sectionTitle).toBeTruthy();
    });

    it('should show status card', () => {
      const statusCard = fixture.nativeElement.querySelector('mat-card');
      expect(statusCard).toBeTruthy();
    });

    it('should show login heading', () => {
      const heading = fixture.nativeElement.querySelector('h2.heading-2');
      expect(heading).toBeTruthy();
    });

    it('should show login button', () => {
      const button = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(button).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should call auth.loginWithGoogle on signIn', async () => {
      await component.signIn();

      expect(authMock.loginWithGoogle).toHaveBeenCalled();
    });

    it('should navigate to /bars/select after successful signIn', async () => {
      await component.signIn();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });

    it('should set isLoading to false after signIn completes', async () => {
      await component.signIn();

      expect(component['isLoading']()).toBe(false);
    });

    it('should set isLoading to false even if login fails', async () => {
      authMock.loginWithGoogle.mockRejectedValueOnce(new Error('fail'));

      try {
        await component.signIn();
      } catch {
        // expected
      }

      expect(component['isLoading']()).toBe(false);
    });
  });
});
