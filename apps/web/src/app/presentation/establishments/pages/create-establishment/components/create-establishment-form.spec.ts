import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EstablishmentListStore } from '@coaster/establishments';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateEstablishmentForm } from './create-establishment-form';

describe('CreateEstablishmentForm', () => {
  let component: CreateEstablishmentForm;
  let fixture: ComponentFixture<CreateEstablishmentForm>;

  const establishmentListStoreMock = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEstablishmentForm],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: EstablishmentListStore, useValue: establishmentListStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(CreateEstablishmentForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should render establishment name input', () => {
      const input = fixture.nativeElement.querySelector('[data-testid="establishment-name-input"]');
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
      component.establishmentForm.name().value.set('');
      fixture.detectChanges();

      expect(component.establishmentForm().invalid()).toBe(true);
    });

    it('should be invalid when name has less than 3 characters', () => {
      component.establishmentForm.name().value.set('Ab');
      fixture.detectChanges();

      expect(component.establishmentForm().invalid()).toBe(true);
    });

    it('should be valid when name has 3 characters', () => {
      component.establishmentForm.name().value.set('Abc');
      fixture.detectChanges();

      expect(component.establishmentForm().invalid()).toBe(false);
    });

    it('should be invalid when name has more than 100 characters', () => {
      component.establishmentForm.name().value.set('A'.repeat(101));
      fixture.detectChanges();

      expect(component.establishmentForm().invalid()).toBe(true);
    });

    it('should be valid when name has exactly 100 characters', () => {
      component.establishmentForm.name().value.set('A'.repeat(100));
      fixture.detectChanges();

      expect(component.establishmentForm().invalid()).toBe(false);
    });
  });

  describe('submitting', () => {
    it('should submit form and emit submit event on success', async () => {
      component.establishmentForm.name().value.set('My New Establishment');
      fixture.detectChanges();

      const submitSpy = vi.spyOn(component.formSubmitted, 'emit');
      const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement;
      submitButton.click();

      await fixture.whenStable();

      expect(establishmentListStoreMock.create).toHaveBeenCalledWith({ name: 'My New Establishment' });
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
