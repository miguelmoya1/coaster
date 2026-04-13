import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EditProductForm } from './edit-product-form';

describe('EditProductForm', () => {
  let component: EditProductForm;
  let fixture: ComponentFixture<EditProductForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProductForm);
    fixture.componentRef.setInput('product', { id: 'p1', name: 'P', currentStock: 0, minStockAlert: 0, lastUpdated: '', categoryId: 'c1' });
    fixture.componentRef.setInput('categories', []);
    fixture.componentRef.setInput('disabled', false);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
