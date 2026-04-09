import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProductForm } from './create-product-form';
import { TranslateModule } from '@ngx-translate/core';

describe('CreateProductForm', () => {
  let component: CreateProductForm;
  let fixture: ComponentFixture<CreateProductForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProductForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductForm);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);
    fixture.componentRef.setInput('categories', []);

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
