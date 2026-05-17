import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/common';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProductForm } from './create-product-form';

describe('CreateProductForm', () => {
  let component: CreateProductForm;
  let fixture: ComponentFixture<CreateProductForm>;
  let mockSubmitAction: ReturnType<typeof vi.fn>;

  const mockCategories: Category[] = [
    { id: asCategoryId('cat-1'), name: 'Drinks', barId: asBarId('bar-1') },
  ];

  beforeEach(async () => {
    mockSubmitAction = vi.fn().mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [CreateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('categories', mockCategories);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('submitAction', mockSubmitAction);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should disable buttons if disabled input is true', async () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      actionButtons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const cancelSpy = vi.spyOn(component.canceled, 'emit');

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const cancelButton = actionButtons[0] as HTMLButtonElement;

      cancelButton.click();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should call submitAction when form is valid and submitted', async () => {
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

      expect(mockSubmitAction).toHaveBeenCalledWith({
        name: 'New Beer',
        categoryId: 'cat-1',
        currentStock: 10,
        minStockAlert: 5,
        price: 0,
      });
    });
  });
});
