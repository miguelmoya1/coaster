import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { UpdateProductForm } from './update-product-form';

describe('UpdateProductForm', () => {
  let component: UpdateProductForm;
  let fixture: ComponentFixture<UpdateProductForm>;

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    currentStock: 10,
    minStockAlert: 5,
    categoryName: 'Drinks',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('disabled', false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize form with product stock', () => {
      expect((component as any).form.currentStock().value()).toBe(10);
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

    it('should emit updateStock when form is submitted', async () => {
      const spy = vi.spyOn(component.updateStock, 'emit');

      // Update stock via form signal
      (component as any).form.currentStock().value.set(15);
      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: any) => btn.getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      // Wait for async form submission
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        currentStock: 15,
      });
    });
  });
});
