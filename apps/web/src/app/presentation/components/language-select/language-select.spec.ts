import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageSelect } from './language-select';

describe('LanguageSelect', () => {
  let component: LanguageSelect;
  let fixture: ComponentFixture<LanguageSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LanguageSelect] }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should offer every language the app has by default', () => {
    expect(fixture.nativeElement.querySelectorAll('mat-chip-option').length).toBe(2);
  });

  it('should name each language in itself rather than translate it', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Español');
    expect(text).toContain('English');
  });

  it('should narrow to the choices it is given', () => {
    fixture.componentRef.setInput('choices', ['en']);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('mat-chip-option');

    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('English');
  });

  it('should report what was chosen and mark itself touched', () => {
    component['onChange']('en');

    expect(component.value()).toBe('en');
    expect(component.touched()).toBe(true);
  });

  it('should keep the language when the chosen chip is tapped again', () => {
    component['onChange']('en');

    component['onChange'](null);

    expect(component.value()).toBe('en');
  });

  it('should ignore a choice while disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component['onChange']('en');

    expect(component.value()).toBe('es');
  });

  it('should render nothing at all when hidden', () => {
    fixture.componentRef.setInput('hidden', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-chip-listbox')).toBeNull();
  });
});
