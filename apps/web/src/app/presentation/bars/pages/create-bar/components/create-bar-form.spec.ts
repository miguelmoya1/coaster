import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { TextInput } from '@coaster/shared';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBarForm } from './create-bar-form';

describe('CreateBarForm', () => {
  let component: CreateBarForm;
  let fixture: ComponentFixture<CreateBarForm>;

  const barsStoreMock = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBarForm],
      providers: [provideTranslateService(), provideRouter([]), { provide: BarsStore, useValue: barsStoreMock }],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(CreateBarForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should render bar name input', () => {
      const input = fixture.nativeElement.querySelector('[data-testid="bar-name-input"]');
      expect(input).toBeTruthy();
    });

    it('should render submit button', () => {
      const button = fixture.nativeElement.querySelector('[data-testid="submit-btn"]');
      expect(button).toBeTruthy();
    });

    it('should render cancel button', () => {
      const button = fixture.nativeElement.querySelector('[data-testid="cancel-btn"]');
      expect(button).toBeTruthy();
    });
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
      const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement;
      submitButton.click();

      await fixture.whenStable();

      expect(barsStoreMock.create).toHaveBeenCalledWith({ name: 'My New Bar' });
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit cancel event', async () => {
      const cancelSpy = vi.spyOn(component.formCancelled, 'emit');
      const button = fixture.nativeElement.querySelector('[data-testid="cancel-btn"]') as HTMLButtonElement;
      button.click();

      fixture.detectChanges();
      await fixture.whenStable();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
