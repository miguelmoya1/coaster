import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoasterTitle, CoasterLabel } from './typography';

@Component({
  standalone: true,
  imports: [CoasterTitle, CoasterLabel],
  template: `
    <h1 coaster-title>Page Title</h1>
    <h2 coaster-title>Section Title</h2>
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
      expect(h1.classList.contains('text-2xl')).toBe(true);
    });

    it('should apply title classes to h2', () => {
      const h2 = fixture.nativeElement.querySelector('h2[coaster-title]') as HTMLElement;
      expect(h2).toBeTruthy();
      expect(h2.classList.contains('tracking-tight')).toBe(true);
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
