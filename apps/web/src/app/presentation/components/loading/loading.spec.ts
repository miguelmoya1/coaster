import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Loading } from './loading';

describe('Loading', () => {
  let component: Loading;
  let fixture: ComponentFixture<Loading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loading],
    }).compileComponents();

    fixture = TestBed.createComponent(Loading);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show the loading spinner', () => {
      const spinner = fixture.nativeElement.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should not show text if not provided', () => {
      const text = fixture.nativeElement.querySelector('p');
      expect(text).toBeNull();
    });

    it('should show text if provided', () => {
      fixture.componentRef.setInput('text', 'Loading data...');
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('p');
      expect(text).toBeTruthy();
      expect(text.textContent).toContain('Loading data...');
    });
  });

  describe('inputs', () => {
    it('should apply custom container classes', () => {
      fixture.componentRef.setInput('containerClasses', 'custom-container');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('div');
      expect(container.classList.contains('custom-container')).toBe(true);
    });

    it('should apply custom text classes', () => {
      fixture.componentRef.setInput('text', 'Wait');
      fixture.componentRef.setInput('textClasses', 'custom-text');
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('p');
      expect(text.classList.contains('custom-text')).toBe(true);
    });
  });
});
