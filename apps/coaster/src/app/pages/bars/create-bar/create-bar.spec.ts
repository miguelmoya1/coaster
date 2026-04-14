import { ComponentFixture, TestBed } from '@angular/core/testing';
import CreateBar from './create-bar';

import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

describe('CreateBar', () => {
  let component: CreateBar;
  let fixture: ComponentFixture<CreateBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuth, useValue: { onAuthStateChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; }, onIdTokenChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
