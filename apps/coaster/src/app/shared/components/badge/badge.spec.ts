import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoasterBadge } from './badge';

@Component({
  standalone: true,
  imports: [CoasterBadge],
  template: `
    <span coaster-badge>Default</span>
    <span coaster-badge variant="success">Success</span>
    <span coaster-badge variant="error">Error</span>
  `,
})
class TestHost {}

describe('CoasterBadge', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('should create badges', () => {
    const badges = fixture.nativeElement.querySelectorAll('span[coaster-badge]');
    expect(badges.length).toBe(3);
  });

  it('should apply neutral classes by default', () => {
    const badge = fixture.nativeElement.querySelector('span[coaster-badge]') as HTMLElement;
    expect(badge.classList.contains('bg-on-surface/10')).toBe(true);
  });

  it('should apply success variant classes', () => {
    const badges = fixture.nativeElement.querySelectorAll('span[coaster-badge]');
    const successBadge = badges[1] as HTMLElement;
    expect(successBadge.classList.contains('text-secondary')).toBe(true);
  });

  it('should apply error variant classes', () => {
    const badges = fixture.nativeElement.querySelectorAll('span[coaster-badge]');
    const errorBadge = badges[2] as HTMLElement;
    expect(errorBadge.classList.contains('text-error')).toBe(true);
  });
});
