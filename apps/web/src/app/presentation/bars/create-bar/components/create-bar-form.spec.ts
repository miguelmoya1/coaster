import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarsStore } from '../../../../bars';
import { TextInput } from '../../../../shared';
import { CreateBarForm } from './create-bar-form';

describe('CreateBarForm', () => {
  let component: CreateBarForm;
  let fixture: ComponentFixture<CreateBarForm>;

  const barsStoreMock = {
    createBar: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBarForm, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: BarsStore, useValue: barsStoreMock }],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(CreateBarForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validators', () => {
    it('should be invalid when name is empty', () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;
      input.value.set('');
      fixture.detectChanges();

      expect(component.barForm().invalid()).toBe(true);
    });

    it('should be invalid when name has less than 3 characters', () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;
      input.value.set('Ab');
      fixture.detectChanges();

      expect(component.barForm().invalid()).toBe(true);
    });

    it('should be valid when name has 3 characters', () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;
      input.value.set('Abc');
      fixture.detectChanges();

      expect(component.barForm().invalid()).toBe(false);
    });

    it('should be invalid when name has more than 100 characters', () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;
      input.value.set('A'.repeat(101));
      fixture.detectChanges();

      expect(component.barForm().invalid()).toBe(true);
    });

    it('should be valid when name has exactly 100 characters', () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;
      input.value.set('A'.repeat(100));
      fixture.detectChanges();

      expect(component.barForm().invalid()).toBe(false);
    });
  });

  describe('submitting', () => {
    it('should submit form and emit submit event on success', async () => {
      const input = fixture.debugElement.query(By.css('[data-testid="bar-name-input"]')).componentInstance as TextInput;

      input.value.set('My New Bar');

      fixture.detectChanges();

      const submitSpy = vi.spyOn(component.formSubmitted, 'emit');
      const submitButton = fixture.debugElement.query(By.css('[data-testid="submit-btn"]'))
        .nativeElement as HTMLButtonElement;
      submitButton.click();

      await fixture.whenStable();

      expect(barsStoreMock.createBar).toHaveBeenCalledWith({ name: 'My New Bar' });
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit cancel event', async () => {
      const cancelSpy = vi.spyOn(component.formCancelled, 'emit');
      const button = fixture.debugElement.query(By.css('[data-testid="cancel-btn"]'))
        .nativeElement as HTMLButtonElement;
      button.click();

      fixture.detectChanges();
      await fixture.whenStable();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
