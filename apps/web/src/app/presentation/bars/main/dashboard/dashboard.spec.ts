import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarMembers } from '../../../../members';
import { BarProducts } from '../../../../products';
import { BarShifts } from '../../../../shifts';
import Dashboard from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard, TranslateModule.forRoot()],
      providers: [
        Dashboard,
        provideRouter([]),
        {
          provide: BarProducts,
          useValue: {
            setBarContext: vi.fn(),
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            total: signal(0),
            criticalStock: signal(0),
            lowStock: signal(0),
          },
        },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]) } } },
        {
          provide: BarShifts,
          useValue: { setContext: vi.fn(), setDateRange: vi.fn(), all: { value: signal([]) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
