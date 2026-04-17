import { ComponentFixture, TestBed } from '@angular/core/testing';
import Roster from './roster';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { vi } from 'vitest';
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
        {
          provide: BarShifts,
          useValue: {
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            setContext: vi.fn(),
            setDateRange: vi.fn(),
            reload: vi.fn(),
          },
        },
        { provide: BarMembers, useValue: { list: { value: signal([]) }, setBarContext: vi.fn(), reload: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
        { provide: CreateShift, useValue: { execute: vi.fn() } },
        { provide: BarExchanges, useValue: { pending: { value: signal([]), isLoading: signal(false), hasValue: signal(true) }, setBarContext: vi.fn(), reload: vi.fn() } },
        { provide: AcceptExchange, useValue: { execute: vi.fn() } },
        { provide: RequestExchange, useValue: { execute: vi.fn() } },
      ],
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
