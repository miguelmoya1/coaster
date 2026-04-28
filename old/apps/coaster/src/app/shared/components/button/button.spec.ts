import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonVariant, CoasterBtn } from './button';

@Component({
  imports: [CoasterBtn],
  template: `<button coaster-btn [variant]="variant">Test</button>`,
})
class TestHost {
  variant: ButtonVariant = 'primary';
}

describe('CoasterBtn', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('should create', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
  });

  describe('rendering', () => {
    it('should project content', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Test');
    });

    it('should have base classes', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(button.className).toContain('rounded-xl');
      expect(button.className).toContain('transition-all');
    });
  });

  describe('variants', () => {
    it('should apply primary classes by default', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(button.className).toContain('from-primary');
      expect(button.className).toContain('text-on-primary-fixed');
    });
  });

  describe('states', () => {
    it('should apply disabled styles via native disabled attribute', () => {
      const button = fixture.nativeElement.querySelector('button');
      button.disabled = true;
      fixture.detectChanges();

      expect(button.className).toContain('disabled:opacity-50');
    });
  });
});
