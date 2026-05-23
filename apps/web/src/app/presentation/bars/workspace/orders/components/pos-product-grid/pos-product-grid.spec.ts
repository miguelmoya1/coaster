import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosProductGrid } from './pos-product-grid';
import { Category, Product, asCategoryId, asProductId, asBarId } from '@coaster/common';

describe('PosProductGrid', () => {
  let component: PosProductGrid;
  let fixture: ComponentFixture<PosProductGrid>;
  let translateService: TranslateService;

  const mockCategories: Category[] = [
    { id: asCategoryId('cat-1'), name: 'templates.categories.cafeteria', barId: asBarId('bar-1') },
    { id: asCategoryId('cat-2'), name: 'templates.categories.refrescos', barId: asBarId('bar-1') },
  ];

  const mockProducts: Product[] = [
    {
      id: asProductId('p-1'),
      name: 'templates.products.cafe_solo',
      price: 120,
      categoryId: asCategoryId('cat-1'),
      currentStock: 10,
      minStockAlert: 5,
      stockStatus: 'good',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-2'),
      name: 'templates.products.agua',
      price: 150,
      categoryId: asCategoryId('cat-2'),
      currentStock: 5,
      minStockAlert: 10,
      stockStatus: 'low',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-3'),
      name: 'Coca-Cola',
      price: 230,
      categoryId: asCategoryId('cat-2'),
      currentStock: 20,
      minStockAlert: 5,
      stockStatus: 'good',
      lastUpdated: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosProductGrid],
      providers: [
        provideTranslateService(),
      ],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    
    // Stub translation keys to return specific values for testing search
    vi.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
      if (typeof key === 'string') {
        if (key === 'templates.products.cafe_solo') return 'Café Solo';
        if (key === 'templates.products.agua') return 'Agua Mineral';
      }
      return key;
    });

    fixture = TestBed.createComponent(PosProductGrid);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('categories', mockCategories);
    fixture.componentRef.setInput('products', mockProducts);
    
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render search input placeholder', () => {
    const inputElement = fixture.nativeElement.querySelector('input');
    expect(inputElement).toBeTruthy();
  });

  describe('filtering logic', () => {
    it('should return all products when query is empty', () => {
      expect(component.filteredProducts()).toEqual(mockProducts);
    });

    it('should filter products by raw name (case insensitive)', () => {
      component.searchQuery.set('coca');
      expect(component.filteredProducts()).toEqual([mockProducts[2]]);
    });

    it('should filter products by translated name (case insensitive)', () => {
      // 'templates.products.cafe_solo' translates to 'Café Solo'
      component.searchQuery.set('café');
      expect(component.filteredProducts()).toEqual([mockProducts[0]]);
    });

    it('should show "no products" message if no match is found', () => {
      component.searchQuery.set('xyz');
      fixture.detectChanges();
      
      const noProductsElement = fixture.nativeElement.querySelector('.col-span-full');
      expect(noProductsElement).toBeTruthy();
      expect(component.filteredProducts().length).toBe(0);
    });
  });

  describe('outputs', () => {
    it('should emit productClicked output when a product is clicked', () => {
      const emitSpy = vi.spyOn(component.productClicked, 'emit');
      const productButton = fixture.nativeElement.querySelector('.grid button');
      expect(productButton).toBeTruthy();
      
      productButton.click();
      expect(emitSpy).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('should emit categorySelected output when a category button is clicked', () => {
      const emitSpy = vi.spyOn(component.categorySelected, 'emit');
      // The first category button after "All Categories" is at index 1
      const categoryButtons = fixture.nativeElement.querySelectorAll('.overflow-x-auto button');
      expect(categoryButtons.length).toBeGreaterThan(1);
      
      categoryButtons[1].click();
      expect(emitSpy).toHaveBeenCalledWith('cat-1');
    });
  });
});
