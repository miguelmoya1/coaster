import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asCategoryId, asProductId } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateStockProductForm } from './update-stock-product-form';

describe('UpdateStockProductForm', () => {
  let component: UpdateStockProductForm;
  let fixture: ComponentFixture<UpdateStockProductForm>;
  let productsStoreMock: {
    updateStock: ReturnType<typeof vi.fn>;
  };

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    stockStatus: 'GOOD',
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(async () => {
    productsStoreMock = {
      updateStock: vi.fn().mockResolvedValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [UpdateStockProductForm],
      providers: [{ provide: ProductsStore, useValue: productsStoreMock }, provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateStockProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize form with product stock', () => {
      expect(component.form.currentStock().value()).toBe(10);
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

    it('should call ProductsStore.updateStock when form is submitted', async () => {
      component.form.currentStock().value.set(15);
      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(productsStoreMock.updateStock).toHaveBeenCalledWith(mockProduct.id, {
        currentStock: 15,
      });
    });
  });
});
