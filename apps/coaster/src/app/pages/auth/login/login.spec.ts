import { ComponentFixture, TestBed } from '@angular/core/testing';
import Login from './login';

import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuth, useValue: { onAuthStateChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; }, onIdTokenChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
