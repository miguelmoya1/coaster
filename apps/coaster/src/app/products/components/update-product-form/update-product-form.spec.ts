import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateProductForm } from './update-product-form';

describe('UpdateProductForm', () => {
  let component: UpdateProductForm;
  let fixture: ComponentFixture<UpdateProductForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateProductForm],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
