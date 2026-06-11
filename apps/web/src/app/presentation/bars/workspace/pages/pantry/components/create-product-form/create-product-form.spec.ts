import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category } from '@coaster/common';
import { asBarId, asCategoryId } from '@coaster/core';
import { ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProductForm } from './create-product-form';

describe('CreateProductForm', () => {
  let component: CreateProductForm;
  let fixture: ComponentFixture<CreateProductForm>;
  let productsStoreMock: {
    create: ReturnType<typeof vi.fn>;
  };

  const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), name: 'Drinks', barId: asBarId('bar-1') }];

  beforeEach(async () => {
    productsStoreMock = {
      create: vi.fn().mockResolvedValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [CreateProductForm],
      providers: [{ provide: ProductsStore, useValue: productsStoreMock }, provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('categories', mockCategories);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const cancelSpy = vi.spyOn(component.canceled, 'emit');

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const cancelButton = actionButtons[0] as HTMLButtonElement;

      cancelButton.click();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should call ProductsStore.create when form is valid and submitted', async () => {
      const f = component.form;
      f.name().value.set('New Beer');
      f.categoryId().value.set(asCategoryId('cat-1'));
      f.currentStock().value.set(10);
      f.minStockAlert().value.set(5);

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(productsStoreMock.create).toHaveBeenCalledWith({
        name: 'New Beer',
        categoryId: 'cat-1',
        currentStock: 10,
        minStockAlert: 5,
        price: 0,
      });
    });
  });
});
