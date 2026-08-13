import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { CategoriesStore } from '@coaster/categories';
import { EstablishmentRole } from '@coaster/common';
import { Product, ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Inventory from './inventory';

describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;

  const categoriesStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setEstablishmentId: vi.fn(),
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
    setEstablishmentId: vi.fn(),
  };

  const myMemberStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue({
        role: EstablishmentRole.STAFF,
        permissions: [],
      }),
      hasValue: vi.fn().mockReturnValue(true),
    },
    isOwner: signal(false),
    hasPermission: vi.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Inventory);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('establishmentId input', () => {
    it('should expose establishmentId with provided value', () => {
      expect(component.establishmentId()).toBe('establishment-1');
    });
  });

  describe('rendering', () => {
    it('should render status cards for product counts', () => {
      fixture.detectChanges();
      const statusCards = fixture.nativeElement.querySelectorAll('mat-card');
      expect(statusCards.length).toBeGreaterThanOrEqual(3);
    });

    it('should render inventory title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('coaster-page-header');
      expect(title).toBeTruthy();
    });

    it('should render tabs', () => {
      fixture.detectChanges();
      const tabs = fixture.nativeElement.querySelector('mat-chip-listbox');
      expect(tabs).toBeTruthy();
    });
  });

  describe('computed properties', () => {
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

      component.selectedCategoryId.set('TEMP_VAL');
      component.selectedCategoryId.set('ALL');

      const filtered = component.filteredProducts();
      expect(filtered[0].id).toBe('p-2');
      expect(filtered[1].id).toBe('p-1');
      expect(filtered[2].id).toBe('p-3');
    });
  });

  describe('actions', () => {
    it('should update searchQuery', () => {
      component.searchQuery.set('whisky');
      expect(component.searchQuery()).toBe('whisky');
    });
  });
});
