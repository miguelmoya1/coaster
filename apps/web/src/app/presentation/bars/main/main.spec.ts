import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentBar } from '../../../bars';
import { CurrentUser } from '../../../core';
import { BarMembers } from '../../../members';
import Main from './main';

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
          useValue: {
            current: { hasValue: signal(true), value: signal({ name: 'Test User', photoUrl: '' }) },
          },
        },
        {
          provide: CurrentBar,
          useValue: {
            current: { hasValue: signal(true), value: signal({ name: 'Test User', photoUrl: '' }) },
            select: vi.fn(),
            clear: vi.fn(),
            setBarContext: vi.fn(),
          },
        },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]), hasValue: signal(true) } } },
      ],
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
