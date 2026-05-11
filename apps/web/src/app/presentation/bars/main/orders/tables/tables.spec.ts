import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import Tables from './tables';
import { signal } from '@angular/core';
import { BarTables, CreateTable, DeleteTable } from '../../../../../tables';
import { BarOrders } from '../../../../../orders';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tables, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: BarTables,
          useValue: {
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            freeCount: signal(0),
            occupiedCount: signal(0),
          },
        },
        {
          provide: BarOrders,
          useValue: {
            reload: vi.fn(),
            all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) },
            openOrders: signal([]),
            totalOpen: signal(0),
            totalRevenue: signal(0),
          },
        },
        { provide: CreateTable, useValue: { create: vi.fn() } },
        { provide: DeleteTable, useValue: { delete: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null), hasValue: signal(false) } } },
        { provide: BarMembers, useValue: { list: { value: signal([]), hasValue: signal(false), isLoading: signal(false) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tables);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
