import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { CreateCategoryForm } from './create-category-form';

describe('CreateCategoryForm', () => {
  let fixture: ComponentFixture<CreateCategoryForm>;
  let component: CreateCategoryForm;
  let mockSubmitAction: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockSubmitAction = vi.fn().mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [CreateCategoryForm],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCategoryForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('submitAction', mockSubmitAction);

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('disabled input', () => {
    it('should accept a disabled input', () => {
      expect(component.disabled()).toBe(false);
    });

    it('should update when disabled input changes', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(component.disabled()).toBe(true);
    });
  });

  describe('outputs', () => {
    it('should emit canceled when cancel is clicked', () => {
      const spy = vi.fn();
      component.canceled.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('rendering', () => {
    it('should render the form element', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    });

    it('should render the cancel button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelBtn = Array.from(buttons).find((btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'button');

      expect(cancelBtn).toBeTruthy();
    });

    it('should render the submit button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find((btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit');

      expect(submitBtn).toBeTruthy();
    });
  });
});
