import { ComponentFixture, TestBed } from '@angular/core/testing';
import SelectBar from './select-bar';

import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

describe('SelectBar', () => {
  let component: SelectBar;
  let fixture: ComponentFixture<SelectBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuth, useValue: { onAuthStateChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; }, onIdTokenChanged: (cb: (user: unknown) => void) => { cb(null); return () => undefined; } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
