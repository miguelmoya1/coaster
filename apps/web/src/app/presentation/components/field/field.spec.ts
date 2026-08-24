import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { Field } from './field';
import { CoasterInput } from './input.directive';

@Component({
  imports: [Field, CoasterInput, FormRoot, FormField],
  template: `
    <form [formRoot]="form">
      <coaster-field [label]="label()" [hint]="hint()">
        <input coasterInput [formField]="form.name" />
      </coaster-field>
    </form>
  `,
})
class Host {
  readonly label = signal('Nombre');
  readonly hint = signal('');
  readonly model = signal({ name: '' });
  readonly form = form(this.model, (fields) => required(fields.name));
}

describe('Field', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  const input = () => element.querySelector('input')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should render the label and tie it to the projected control', () => {
    const label = element.querySelector('label')!;

    expect(label.textContent).toContain('Nombre');
    expect(label.getAttribute('for')).toBe(input().id);
    expect(input().id).toBeTruthy();
  });

  it('should paint the control with the shared style', () => {
    expect(input().className).toContain('rounded-xl');
    expect(input().className).toContain('bg-surface-container-highest');
  });

  it('should stay silent while the field is untouched', () => {
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(input().className).not.toContain('border-error');
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('should show the error and paint the control once the field is touched', () => {
    fixture.componentInstance.form.name().markAsTouched();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('required');
    expect(input().className).toContain('border-error');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('should fall back to the hint when there is no error', () => {
    fixture.componentInstance.hint.set('Como aparece en la carta');
    fixture.detectChanges();

    expect(element.textContent).toContain('Como aparece en la carta');
  });

  it('should hide the hint while an error is shown', () => {
    fixture.componentInstance.hint.set('Como aparece en la carta');
    fixture.componentInstance.form.name().markAsTouched();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Como aparece en la carta');
  });
});
