import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Category, Order, Table } from '@coaster/common';
import { asOrderId } from '@coaster/common';
import { ManageOrder } from '@coaster/orders';
import type { Product } from '@coaster/products';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewOrder from './new-order';

describe('NewOrder', () => {
  let component: NewOrder;
  let fixture: ComponentFixture<NewOrder>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };

  let products = fakeResource<Product[]>([]);

  const manageOrderMock = {
    create: vi.fn().mockResolvedValue(undefined),
    addItems: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewOrder],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: ManageOrder, useValue: manageOrderMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(NewOrder);
    products = fakeResource<Product[]>([]);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.componentRef.setInput('products', products.resource);
    fixture.componentRef.setInput('categories', fakeResource<Category[]>([]).resource);
    fixture.componentRef.setInput('tables', fakeResource<Table[]>([]).resource);
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
    it('should render title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.heading-2');
      expect(title).toBeTruthy();
    });

    it('should render back button', () => {
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn).toBeTruthy();
    });

    it('should render search component', () => {
      fixture.detectChanges();
      const search = fixture.nativeElement.querySelector('coaster-pos-search');
      expect(search).toBeTruthy();
    });

    it('should render category selector', () => {
      fixture.detectChanges();
      const selector = fixture.nativeElement.querySelector('coaster-category-filter');
      expect(selector).toBeTruthy();
    });

    it('should render products list', () => {
      fixture.detectChanges();
      const list = fixture.nativeElement.querySelector('coaster-pos-products-list');
      expect(list).toBeTruthy();
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
      products.resolve(mockProducts);

      const filtered = component['filteredProducts']();
      expect(filtered[0].id).toBe('p-2');
      expect(filtered[1].id).toBe('p-1');
      expect(filtered[2].id).toBe('p-3');
    });
  });

  describe('actions', () => {
    it('should navigate back on goBack', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/establishments', 'establishment-1', 'orders', 'tables']);
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

  describe('adding to an order that already exists', () => {
    it('should bring in the notes the order already had', async () => {
      fixture.componentRef.setInput('orderId', asOrderId('order-1'));
      fixture.componentRef.setInput('order', fakeResource({ id: 'order-1', notes: 'mesa exterior' } as Order).resource);
      await fixture.whenStable();

      expect(component.isAddItemsMode()).toBe(true);
      expect(component.orderNotes()).toBe('mesa exterior');
    });

    it('should add the cart to that order rather than open a new one', async () => {
      fixture.componentRef.setInput('orderId', asOrderId('order-1'));
      fixture.componentRef.setInput('order', fakeResource({ id: 'order-1' } as Order).resource);
      await fixture.whenStable();
      component.addToCart({ id: 'p-1', name: 'Beer', price: 500 } as Product);

      await component.submitOrder();

      expect(manageOrderMock.addItems).toHaveBeenCalled();
      expect(manageOrderMock.create).not.toHaveBeenCalled();
    });
  });
});
