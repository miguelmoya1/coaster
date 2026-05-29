import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CategoriesStore } from '@coaster/categories';
import { Product, ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Pantry from './pantry';

describe('Pantry', () => {
  let component: Pantry;
  let fixture: ComponentFixture<Pantry>;

  const categoriesStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    reloadCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const productsStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    total: vi.fn().mockReturnValue(0),
    criticalStock: vi.fn().mockReturnValue(0),
    lowStock: vi.fn().mockReturnValue(0),
    delete: vi.fn().mockResolvedValue(null),
    setBarId: vi.fn(),
  };

  const barsStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue({
        role: 'STAFF',
        permissions: [],
      }),
      hasValue: vi.fn().mockReturnValue(true),
    },
    isOwner: signal(false),
    hasPermission: vi.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pantry],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: BarsStore, useValue: barsStoreMock },
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

    it('should filter products by category', () => {
      const mockProducts = [
        { id: 'p-1', name: 'Vodka', categoryId: 'cat-1' },
        { id: 'p-2', name: 'Ron', categoryId: 'cat-2' },
      ] as Product[];
      productsStoreMock.list.value.mockReturnValue(mockProducts);
      productsStoreMock.list.hasValue.mockReturnValue(true);

      component.selectedCategoryId.set('cat-1');
      expect(component.filteredProducts()).toEqual([mockProducts[0]]);
    });

    it('should filter products by search query case-insensitively', () => {
      const mockProducts = [
        { id: 'p-1', name: 'Vodka', categoryId: 'cat-1' },
        { id: 'p-2', name: 'Ron', categoryId: 'cat-2' },
      ] as Product[];
      productsStoreMock.list.value.mockReturnValue(mockProducts);
      productsStoreMock.list.hasValue.mockReturnValue(true);

      component.selectedCategoryId.set('ALL');
      component.searchQuery.set('vod');
      expect(component.filteredProducts()).toEqual([mockProducts[0]]);

      component.searchQuery.set('  RON  ');
      expect(component.filteredProducts()).toEqual([mockProducts[1]]);
    });

    it('should filter products by both category and search query', () => {
      const mockProducts = [
        { id: 'p-1', name: 'Vodka Superior', categoryId: 'cat-1' },
        { id: 'p-2', name: 'Vodka Barata', categoryId: 'cat-2' },
      ] as Product[];
      productsStoreMock.list.value.mockReturnValue(mockProducts);
      productsStoreMock.list.hasValue.mockReturnValue(true);

      component.selectedCategoryId.set('cat-1');
      component.searchQuery.set('Vodka');
      expect(component.filteredProducts()).toEqual([mockProducts[0]]);
    });

    it('should sort products alphabetically by translated name', () => {
      const mockProducts = [
        { id: 'p-1', name: 'Vodka', categoryId: 'cat-1' },
        { id: 'p-2', name: 'Absolut Vodka', categoryId: 'cat-1' },
        { id: 'p-3', name: 'Zinebra', categoryId: 'cat-1' },
      ] as Product[];
      productsStoreMock.list.value.mockReturnValue(mockProducts);
      productsStoreMock.list.hasValue.mockReturnValue(true);

      // Trigger re-evaluation of the computed signal by changing its state
      component.selectedCategoryId.set('TEMP_VAL');
      component.selectedCategoryId.set('ALL');

      const filtered = component.filteredProducts();
      expect(filtered[0].id).toBe('p-2'); // Absolut Vodka
      expect(filtered[1].id).toBe('p-1'); // Vodka
      expect(filtered[2].id).toBe('p-3'); // Zinebra
    });

    it('should return tabs with ALL as first option', () => {
      const tabs = component.tabs();
      expect(tabs.length).toBeGreaterThanOrEqual(1);
      expect(tabs[0].id).toBe('ALL');
    });
  });

  describe('actions', () => {
    it('should set product selected on click', () => {
      const product = { id: 'p-1', name: 'Product 1' } as Product;
      component.onProductClicked(product);
      expect(component.productSelected()).toEqual(product);
    });

    it('should set product to edit', () => {
      const product = { id: 'p-1', name: 'Product 1' } as Product;
      component.onEditProductClicked(product);
      expect(component.productToEdit()).toEqual(product);
    });

    it('should update searchQuery', () => {
      component.searchQuery.set('whisky');
      expect(component.searchQuery()).toBe('whisky');
    });

    it('should clear state on closeModal', () => {
      component.productSelected.set({ id: 'p-1' } as Product);
      component.closeModal();

      expect(component.productSelected()).toBeNull();
      expect(component.productToEdit()).toBeNull();
      expect(component.categoryToEdit()).toBeNull();
    });
  });
});
