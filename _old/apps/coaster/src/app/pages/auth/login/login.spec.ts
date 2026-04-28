import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { Auth } from '../../../core';
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
      imports: [Login, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: Auth, useValue: authMock }, { provide: Router, useValue: routerMock }],
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
      const sectionTitle = fixture.nativeElement.querySelector('coaster-section-title');
      expect(sectionTitle).toBeTruthy();
    });

    it('should show login button', () => {
      const button = fixture.nativeElement.querySelector('button[coaster-btn]');
      expect(button).toBeTruthy();
      // TranslateModule might not have keys loaded, but we check if it's there.
    });
  });

  describe('actions', () => {
    it('should call auth.loginWithGoogle and navigate on signIn', async () => {
      const button = fixture.nativeElement.querySelector('button[coaster-btn]');
      button.click();

      expect(authMock.loginWithGoogle).toHaveBeenCalled();

      // Wait for async actions
      await fixture.whenStable();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });
  });
});
