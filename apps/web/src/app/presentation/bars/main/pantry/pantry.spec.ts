import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarCategories, CreateCategory, DeleteCategory, EditCategory } from '../../../../categories';
import { CurrentUser } from '../../../../core';
import { BarMembers } from '../../../../members';
import { BarProducts, CreateProduct, DeleteProduct, EditProduct, UpdateProduct } from '../../../../products';
import Pantry from './pantry';

describe('Pantry', () => {
  let component: Pantry;
  let fixture: ComponentFixture<Pantry>;

  const productsMock = {
    all: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    total: signal(0),
    criticalStock: signal(0),
    lowStock: signal(0),
    reload: vi.fn(),
  };

  const categoriesMock = {
    all: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    reload: vi.fn(),
  };

  const currentUserMock = {
    current: {
      value: vi.fn().mockReturnValue({ id: 'u-1' }),
      hasValue: vi.fn().mockReturnValue(true),
    },
  };

  const barMembersMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pantry],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: BarProducts, useValue: productsMock },
        { provide: BarCategories, useValue: categoriesMock },
        { provide: CreateProduct, useValue: { create: vi.fn() } },
        { provide: CreateCategory, useValue: { create: vi.fn() } },
        { provide: EditCategory, useValue: { edit: vi.fn() } },
        { provide: EditProduct, useValue: { edit: vi.fn() } },
        { provide: UpdateProduct, useValue: { update: vi.fn() } },
        { provide: DeleteProduct, useValue: { delete: vi.fn() } },
        { provide: DeleteCategory, useValue: { delete: vi.fn() } },
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: BarMembers, useValue: barMembersMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Pantry);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('barId input', () => {
    it('should expose barId with provided value', () => {
      expect(component.barId()).toBe('bar-1');
    });
  });

  describe('rendering', () => {
    it('should render status cards for product counts', () => {
      fixture.detectChanges();
      const statusCards = fixture.nativeElement.querySelectorAll('coaster-status-card');
      expect(statusCards.length).toBeGreaterThanOrEqual(3);
    });

    it('should render inventory title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('[coaster-title]');
      expect(title).toBeTruthy();
    });

    it('should render tabs', () => {
      fixture.detectChanges();
      const tabs = fixture.nativeElement.querySelector('coaster-tabs');
      expect(tabs).toBeTruthy();
    });
  });

  describe('computed properties', () => {
    it('should start with PRODUCT tab selected', () => {
      expect(component.currentTab()).toBe('PRODUCT');
    });

    it('should start with ALL category selected', () => {
      expect(component.selectedCategoryId()).toBe('ALL');
    });

    it('should return empty filtered products when no products', () => {
      expect(component.filteredProducts()).toEqual([]);
    });

    it('should return tabs with ALL as first option', () => {
      const tabs = component.tabs();
      expect(tabs.length).toBeGreaterThanOrEqual(1);
      expect(tabs[0].id).toBe('ALL');
    });

    it('should return undefined currentUserRole when no matching member', () => {
      expect(component.currentUserRole()).toBeUndefined();
    });
  });

  describe('actions', () => {
    it('should set product selected on click', () => {
      const product = { id: 'p-1', name: 'Product 1' } as any;
      component.onProductClicked(product);
      expect(component.productSelected()).toEqual(product);
    });

    it('should set product to edit', () => {
      const product = { id: 'p-1', name: 'Product 1' } as any;
      component.onEditProductClicked(product);
      expect(component.productToEdit()).toEqual(product);
    });

    it('should clear state on closeModal', () => {
      component.productSelected.set({ id: 'p-1' } as any);
      component.closeModal();

      expect(component.productSelected()).toBeNull();
      expect(component.productToEdit()).toBeNull();
      expect(component.categoryToEdit()).toBeNull();
    });
  });
});
