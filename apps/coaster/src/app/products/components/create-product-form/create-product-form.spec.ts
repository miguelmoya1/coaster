import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { CreateProductForm } from './create-product-form';

describe('CreateProductForm', () => {
  let component: CreateProductForm;
  let fixture: ComponentFixture<CreateProductForm>;

  const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), name: 'Drinks', barId: asBarId('bar-1') }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('categories', mockCategories);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show error message if error input is set', () => {
      fixture.componentRef.setInput('error', 'test error');
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('test error');
    });

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

    it('should emit createProduct when form is valid and submitted', async () => {
      const spy = vi.spyOn(component.createProduct, 'emit');

      const f = (component as any).form;
      f.name().value.set('New Beer');
      f.categoryId().value.set('cat-1');
      f.currentStock().value.set(10);
      f.minStockAlert().value.set(5);

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: any) => btn.getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        name: 'New Beer',
        categoryId: 'cat-1',
        currentStock: 10,
        minStockAlert: 5,
      });
    });
  });
});
