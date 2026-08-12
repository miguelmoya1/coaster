import { asEstablishmentId, asCategoryId, asProductId } from '@coaster/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category } from '@coaster/common';
import { Product, ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProductForm } from './update-product-form';

describe('UpdateProductForm', () => {
  let component: UpdateProductForm;
  let fixture: ComponentFixture<UpdateProductForm>;
  let productsStoreMock: {
    update: ReturnType<typeof vi.fn>;
    currentEstablishmentId: ReturnType<typeof signal>;
  };

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    allergens: [],
    stockStatus: 'GOOD',
    lastUpdated: '2022-01-01T00:00:00.000Z',
  };

  const mockCategories: Category[] = [
    { id: asCategoryId('cat-1'), name: 'Drinks', establishmentId: asEstablishmentId('establishment-1') },
  ];

  beforeEach(async () => {
    productsStoreMock = {
      update: vi.fn().mockResolvedValue(null),
      currentEstablishmentId: signal(asEstablishmentId('establishment-1')),
    };

    await TestBed.configureTestingModule({
      imports: [UpdateProductForm],
      providers: [{ provide: ProductsStore, useValue: productsStoreMock }, provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('categories', mockCategories);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize form with product data', () => {
      const f = component.form;
      expect(f.name().value()).toBe('Beer');
      expect(f.categoryId().value()).toBe('cat-1');
      expect(f.minStockAlert().value()).toBe(5);
    });
  });

  describe('allergens', () => {
    it('should start from what the product declares', async () => {
      fixture.componentRef.setInput('product', { ...mockProduct, allergens: ['GLUTEN'] });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.allergens().value()).toEqual(['GLUTEN']);
    });

    it('should offer the fourteen, translated', () => {
      const options = component['allergenOptions']();

      expect(options).toHaveLength(14);
      expect(options[0].value).toBe('GLUTEN');
    });

    it('should send them with the update', async () => {
      component.form.allergens().value.set(['FISH']);
      fixture.detectChanges();

      const submitButton = Array.from(
        fixture.nativeElement.querySelectorAll('.justify-end button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.getAttribute('type') === 'submit');

      submitButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(productsStoreMock.update).toHaveBeenCalledWith(
        mockProduct.id,
        expect.objectContaining({ allergens: ['FISH'] }),
      );
    });
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');
      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const cancelButton = actionButtons[0] as HTMLButtonElement;

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should call ProductsStore.update when form is valid and submitted', async () => {
      const f = component.form;
      f.name().value.set('Updated Beer');

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(productsStoreMock.update).toHaveBeenCalledWith(mockProduct.id, {
        name: 'Updated Beer',
        categoryId: 'cat-1',
        minStockAlert: 5,
        price: 1050,
        imageUrl: '',
        allergens: [],
      });
    });
  });
});
