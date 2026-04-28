import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoasterTitle, CoasterLabel } from './typography';

@Component({
  imports: [CoasterTitle, CoasterLabel],
  template: `
    <h1 coaster-title>Page Title</h1>
    <h2 coaster-title>Section Title</h2>
    <h3 coaster-title>Card Title</h3>
    <h4 coaster-title>Subtitle 1</h4>
    <h5 coaster-title>Subtitle 2</h5>
    <h6 coaster-title>Tiny Title</h6>
    <label coaster-label for="test-input">Field Label</label>
    <input id="test-input" />
  `,
})
class TestHost {}

describe('Typography Directives', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  describe('CoasterTitle', () => {
    it('should apply title classes to h1', () => {
      const h1 = fixture.nativeElement.querySelector('h1[coaster-title]') as HTMLElement;
      expect(h1).toBeTruthy();
      expect(h1.classList.contains('font-black')).toBe(true);
      expect(h1.classList.contains('text-primary')).toBe(true);
      expect(h1.classList.contains('text-3xl')).toBe(true);
    });

    it('should apply title classes to h2', () => {
      const h2 = fixture.nativeElement.querySelector('h2[coaster-title]') as HTMLElement;
      expect(h2).toBeTruthy();
      expect(h2.classList.contains('font-black')).toBe(true);
      expect(h2.classList.contains('text-2xl')).toBe(true);
      expect(h2.classList.contains('tracking-tight')).toBe(true);
    });

    it('should apply title classes to h3', () => {
      const h3 = fixture.nativeElement.querySelector('h3[coaster-title]') as HTMLElement;
      expect(h3).toBeTruthy();
      expect(h3.classList.contains('font-bold')).toBe(true);
      expect(h3.classList.contains('text-xl')).toBe(true);
    });

    it('should apply title classes to h4', () => {
      const h4 = fixture.nativeElement.querySelector('h4[coaster-title]') as HTMLElement;
      expect(h4).toBeTruthy();
      expect(h4.classList.contains('font-bold')).toBe(true);
      expect(h4.classList.contains('text-lg')).toBe(true);
    });

    it('should apply title classes to h5', () => {
      const h5 = fixture.nativeElement.querySelector('h5[coaster-title]') as HTMLElement;
      expect(h5).toBeTruthy();
      expect(h5.classList.contains('font-semibold')).toBe(true);
      expect(h5.classList.contains('text-base')).toBe(true);
    });

    it('should apply title classes to h6', () => {
      const h6 = fixture.nativeElement.querySelector('h6[coaster-title]') as HTMLElement;
      expect(h6).toBeTruthy();
      expect(h6.classList.contains('font-medium')).toBe(true);
      expect(h6.classList.contains('text-sm')).toBe(true);
      expect(h6.classList.contains('uppercase')).toBe(true);
    });
  });

  describe('CoasterLabel', () => {
    it('should apply label classes', () => {
      const label = fixture.nativeElement.querySelector('label[coaster-label]') as HTMLElement;
      expect(label).toBeTruthy();
      expect(label.classList.contains('uppercase')).toBe(true);
      expect(label.classList.contains('tracking-wider')).toBe(true);
      expect(label.classList.contains('text-on-surface-variant')).toBe(true);
    });
  });
});
