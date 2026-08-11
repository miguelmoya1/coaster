import { asEstablishmentId, asCategoryId, asProductId } from '@coaster/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category } from '@coaster/common';
import { Product, ProductsStore } from '@coaster/products';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
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
      });
    });
  });

  describe('a product imported from the catalogue', () => {
    const imported: Product = { ...mockProduct, name: 'templates.products.coffee_black' };

    const submit = async () => {
      const submitButton = Array.from(
        fixture.nativeElement.querySelectorAll('.justify-end button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.getAttribute('type') === 'submit');

      submitButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    beforeEach(() => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('es', { 'templates.products.coffee_black': 'Café solo' }, true);
      translate.use('es');

      fixture.componentRef.setInput('product', imported);
      fixture.detectChanges();
    });

    it('should show the translated name rather than the key it is stored under', () => {
      expect(component.form.name().value()).toBe('Café solo');
    });

    it('should not let it be renamed', () => {
      expect(component.form.name().disabled()).toBe(true);
      expect(fixture.nativeElement.querySelector('input[matInput]').disabled).toBe(true);
    });

    it('should leave the name out of the update so the key survives', async () => {
      await submit();

      expect(productsStoreMock.update).toHaveBeenCalledWith(imported.id, {
        categoryId: 'cat-1',
        minStockAlert: 5,
        price: 1050,
        imageUrl: '',
      });
    });

    it('should still allow everything else to be edited', async () => {
      component.form.price().value.set(180);
      fixture.detectChanges();

      await submit();

      expect(productsStoreMock.update).toHaveBeenCalledWith(imported.id, expect.objectContaining({ price: 180 }));
    });
  });
});
