import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateCategoryForm } from './create-category-form';
import { TranslateModule } from '@ngx-translate/core';

describe('CreateCategoryForm', () => {
  let component: CreateCategoryForm;
  let fixture: ComponentFixture<CreateCategoryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCategoryForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCategoryForm);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);
    
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
