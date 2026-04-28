import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Roster from './roster';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { BarShifts, CreateShift } from '../../../../shifts';
import { BarMembers } from '../../../../members';
import { CurrentUser } from '../../../../core';
import { AcceptExchange, BarExchanges, RequestExchange } from '../../../../exchanges';

describe('Roster', () => {
  let component: Roster;
  let fixture: ComponentFixture<Roster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roster, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarShifts,
          useValue: {
            setContext: vi.fn(),
            setDateRange: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
          },
        },
        { provide: CreateShift, useValue: { create: vi.fn() } },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]) } } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
        { provide: BarExchanges, useValue: { setBarContext: vi.fn(), pending: { value: signal([]), isLoading: signal(false), hasValue: signal(true) } } },
        { provide: RequestExchange, useValue: { request: vi.fn() } },
        { provide: AcceptExchange, useValue: { accept: vi.fn() } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Roster);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
