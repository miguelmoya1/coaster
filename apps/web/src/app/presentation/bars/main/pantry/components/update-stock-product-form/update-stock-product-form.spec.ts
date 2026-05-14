import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asCategoryId, asProductId, Product } from '@coaster/common';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProductForm } from './update-stock-product-form';

describe('UpdateProductForm', () => {
  let component: UpdateProductForm;
  let fixture: ComponentFixture<UpdateProductForm>;
  let mockSubmitAction: ReturnType<typeof vi.fn>;

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    stockStatus: 'good',
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockSubmitAction = vi.fn().mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [UpdateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('submitAction', mockSubmitAction);

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

    it('should call submitAction when form is submitted', async () => {
      component.form.currentStock().value.set(15);
      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSubmitAction).toHaveBeenCalledWith({
        currentStock: 15,
      });
    });
  });
});
