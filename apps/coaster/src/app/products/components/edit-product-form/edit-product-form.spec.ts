import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Category, Product } from '@coaster/interfaces';
import { TranslateModule } from '@ngx-translate/core';
import { EditProductForm } from './edit-product-form';

describe('EditProductForm', () => {
  let component: EditProductForm;
  let fixture: ComponentFixture<EditProductForm>;

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    currentStock: 10,
    minStockAlert: 5,
    stockStatus: 'good',
    lastUpdated: '2022-01-01T00:00:00.000Z',
  };

  const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), name: 'Drinks', barId: asBarId('bar-1') }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('categories', mockCategories);
    fixture.componentRef.setInput('disabled', false);

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

    it('should emit editProduct when form is valid and submitted', async () => {
      const spy = vi.spyOn(component.editProduct, 'emit');

      const f = component.form;
      f.name().value.set('Updated Beer');

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        name: 'Updated Beer',
        categoryId: 'cat-1',
        minStockAlert: 5,
      });
    });
  });
});
