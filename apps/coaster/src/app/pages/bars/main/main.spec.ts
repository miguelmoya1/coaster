import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import Main from './main';
import { CurrentUser } from '../../../core';
import { CurrentBar } from '../../../bars';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Main, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: CurrentUser,
          useValue: { current: { hasValue: signal(true), value: signal({ name: 'Test User', photoUrl: '' }) } }
        },
        {
          provide: CurrentBar,
          useValue: { current: { hasValue: signal(true), value: signal({ name: 'Test Bar' }) }, select: vi.fn(), clear: vi.fn() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

