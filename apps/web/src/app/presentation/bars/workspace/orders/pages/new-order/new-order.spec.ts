import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CategoriesStore } from '@coaster/categories';
import { Product } from '@coaster/common';
import { OrdersStore } from '@coaster/orders';
import { ProductsStore } from '@coaster/products';
import { TablesStore } from '@coaster/tables';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewOrder from './new-order';

describe('NewOrder', () => {
  let component: NewOrder;
  let fixture: ComponentFixture<NewOrder>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };

  const categoriesStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    reloadCategories: vi.fn(),
  };

  const productsStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
  };

  const tablesStoreMock = {
    tables: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    setTableId: vi.fn(),
    reload: vi.fn(),
  };

  const ordersStoreMock = {
    create: vi.fn(),
    addItems: vi.fn(),
    reloadOrders: vi.fn(),
    setBarId: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewOrder],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: TablesStore, useValue: tablesStoreMock },
        { provide: OrdersStore, useValue: ordersStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(NewOrder);
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
    it('should render title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('[coaster-title]');
      expect(title).toBeTruthy();
    });

    it('should render back button', () => {
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn).toBeTruthy();
    });

    it('should render product grid', () => {
      fixture.detectChanges();
      const grid = fixture.nativeElement.querySelector('coaster-pos-product-grid');
      expect(grid).toBeTruthy();
    });

    it('should render cart', () => {
      fixture.detectChanges();
      const cart = fixture.nativeElement.querySelector('coaster-pos-cart');
      expect(cart).toBeTruthy();
    });
  });

  describe('computed properties', () => {
    it('should start with empty cart', () => {
      expect(component.cartItems()).toEqual([]);
    });

    it('should start not in add items mode', () => {
      expect(component.isAddItemsMode()).toBe(false);
    });

    it('should return empty filtered products when no products', () => {
      expect(component['filteredProducts']()).toEqual([]);
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
      component.selectedCategory.set('TEMP_VAL');
      component.selectedCategory.set(undefined);

      const filtered = component['filteredProducts']();
      expect(filtered[0].id).toBe('p-2'); // Absolut Vodka
      expect(filtered[1].id).toBe('p-1'); // Vodka
      expect(filtered[2].id).toBe('p-3'); // Zinebra
    });
  });

  describe('actions', () => {
    it('should navigate back on goBack', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars', 'bar-1', 'orders', 'tables']);
    });

    it('should add product to cart', () => {
      const product = { id: 'p-1', name: 'Beer', price: 500 } as Product;
      component.addToCart(product);

      expect(component.cartItems().length).toBe(1);
      expect(component.cartItems()[0].productId).toBe('p-1');
      expect(component.cartItems()[0].quantity).toBe(1);
    });

    it('should increment existing cart item', () => {
      const product = { id: 'p-1', name: 'Beer', price: 500 } as Product;
      component.addToCart(product);
      component.incrementItem('p-1');

      expect(component.cartItems()[0].quantity).toBe(2);
    });

    it('should decrement cart item', () => {
      const product = { id: 'p-1', name: 'Beer', price: 500 } as Product;
      component.addToCart(product);
      component.addToCart(product);
      component.decrementItem('p-1');

      expect(component.cartItems()[0].quantity).toBe(1);
    });

    it('should remove cart item when decrementing to 0', () => {
      const product = { id: 'p-1', name: 'Beer', price: 500 } as Product;
      component.addToCart(product);
      component.decrementItem('p-1');

      expect(component.cartItems().length).toBe(0);
    });
  });
});
