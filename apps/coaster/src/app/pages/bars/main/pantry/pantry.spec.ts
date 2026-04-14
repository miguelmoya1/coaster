import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import Pantry from './pantry';
import { CurrentUser } from '../../../../core';
import { BarProducts, CreateProduct, EditProduct, UpdateProduct } from '../../../../products';
import { BarCategories, CreateCategory } from '../../../../categories';
import { BarMembers } from '../../../../members';
import { signal } from '@angular/core';

describe('Pantry', () => {
  let component: Pantry;
  let fixture: ComponentFixture<Pantry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pantry, TranslateModule.forRoot()],
      providers: [
        { provide: BarProducts, useValue: { setBarContext: vi.fn(), reload: vi.fn(), all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) }, total: signal(0), criticalStock: signal(0), lowStock: signal(0) } },
        { provide: BarCategories, useValue: { setBarContext: vi.fn(), reload: vi.fn(), all: { value: signal([]), isLoading: signal(false), hasValue: signal(true) } } },
        { provide: CreateProduct, useValue: { create: vi.fn() } },
        { provide: CreateCategory, useValue: { create: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
        { provide: BarMembers, useValue: { setBarContext: vi.fn(), list: { value: signal([]) } } },
        { provide: EditProduct, useValue: { edit: vi.fn() } },
        { provide: UpdateProduct, useValue: { update: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Pantry);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
