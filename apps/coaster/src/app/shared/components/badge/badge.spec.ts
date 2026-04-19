import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeVariant, CoasterBadge } from './badge';

@Component({
  standalone: true,
  imports: [CoasterBadge],
  template: `<span [coaster-badge] [variant]="variant">Badge Content</span>`,
})
class TestHost {
  variant: BadgeVariant = 'neutral';
}

describe('CoasterBadge', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('should create', () => {
    const badge = fixture.nativeElement.querySelector('span');
    expect(badge).toBeTruthy();
  });

  describe('rendering', () => {
    it('should project content', () => {
      const badge = fixture.nativeElement.querySelector('span');
      expect(badge.textContent).toContain('Badge Content');
    });

    it('should have base classes', () => {
      const badge = fixture.nativeElement.querySelector('span');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('font-bold');
    });
  });

  describe('variants', () => {
    it('should apply neutral classes by default', () => {
      const badge = fixture.nativeElement.querySelector('span');
      expect(badge.className).toContain('bg-on-surface/10');
      expect(badge.className).toContain('text-on-surface-variant');
    });
  });
});
