import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { EditCategoryForm } from './edit-category-form';

describe('EditCategoryForm', () => {
  let fixture: ComponentFixture<EditCategoryForm>;
  let component: EditCategoryForm;
  let mockSubmitAction: ReturnType<typeof vi.fn>;

  const mockCategory: Category = {
    id: asCategoryId('cat-1'),
    barId: asBarId('bar-1'),
    name: 'Tapas',
    icon: '🍕',
  };

  beforeEach(async () => {
    mockSubmitAction = vi.fn().mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [EditCategoryForm],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCategoryForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('category', mockCategory);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('submitAction', mockSubmitAction);

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('category input', () => {
    it('should expose the category signal with the provided value', () => {
      expect(component.category()).toEqual(mockCategory);
    });

    it('should update when category input changes', () => {
      const updatedCategory: Category = {
        id: asCategoryId('cat-2'),
        barId: asBarId('bar-1'),
        name: 'Cocktails',
        icon: '🍸',
      };
      fixture.componentRef.setInput('category', updatedCategory);
      fixture.detectChanges();

      expect(component.category()).toEqual(updatedCategory);
    });
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
    it('should emit canceled output', () => {
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
