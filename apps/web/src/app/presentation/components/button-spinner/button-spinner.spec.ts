import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ButtonSpinner } from './button-spinner';

describe('ButtonSpinner', () => {
  let fixture: ComponentFixture<ButtonSpinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ButtonSpinner] }).compileComponents();

    fixture = TestBed.createComponent(ButtonSpinner);
    fixture.detectChanges();
  });

  it('should use the Material spinner rather than a hand-rolled circle', () => {
    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeTruthy();
  });

  it('should sit inline, so a button lays it beside its label instead of above it', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.className).toContain('inline-flex');
    expect(host.className).toContain('shrink-0');
  });

  it('should take no more room than the size asked for', () => {
    fixture.componentRef.setInput('diameter', 24);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;

    expect(host.style.width).toBe('24px');
    expect(host.style.height).toBe('24px');
  });

  it('should announce itself as busy for a screen reader', () => {
    expect((fixture.nativeElement as HTMLElement).getAttribute('role')).toBe('status');
  });
});
