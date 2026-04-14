import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateProductForm } from './update-product-form';

import { TranslateModule } from '@ngx-translate/core';

describe('UpdateProductForm', () => {
  let component: UpdateProductForm;
  let fixture: ComponentFixture<UpdateProductForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductForm);
    fixture.componentRef.setInput('product', { id: 'p-1', name: 'Test', currentStock: 0, minStockAlert: 0 });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
