import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { asBarId, Product } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesStore } from '../../../../../categories';
import { OrdersStore } from '../../../../../orders';
import { BarProducts } from '../../../../../products';
import { BarTables } from '../../../../../tables';
import NewOrder from './new-order';

describe('NewOrder', () => {
  let component: NewOrder;
  let fixture: ComponentFixture<NewOrder>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };

  const productsMock = {
    all: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    reload: vi.fn(),
  };

  const categoriesStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    reloadCategories: vi.fn(),
  };

  const tablesMock = {
    all: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    reload: vi.fn(),
  };

  const ordersStoreMock = {
    create: vi.fn(),
    addItems: vi.fn(),
    reloadOrders: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewOrder],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: BarProducts, useValue: productsMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: BarTables, useValue: tablesMock },
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
