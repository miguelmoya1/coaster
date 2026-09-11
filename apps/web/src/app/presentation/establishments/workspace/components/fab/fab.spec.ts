import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIcon } from '@angular/material/icon';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomBar } from '../bottom-bar/bottom-bar';
import { Fab } from './fab';

describe('Fab', () => {
  let component: Fab;
  let fixture: ComponentFixture<Fab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fab, MatIcon],
    }).compileComponents();

    fixture = TestBed.createComponent(Fab);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should be a circle, not the old squircle', () => {
      const hostElement = fixture.nativeElement;
      expect(hostElement.classList.contains('fixed')).toBe(true);
      expect(hostElement.classList.contains('rounded-full')).toBe(true);
      expect(hostElement.classList.contains('rounded-2xl')).toBe(false);
      expect(hostElement.classList.contains('bg-linear-to-br')).toBe(true);
    });

    it('should sit on the right edge of the same box the bar is measured from', () => {
      const style = fixture.nativeElement.getAttribute('style') ?? '';

      expect(style).toContain('bottom: var(--bottom-bar-inset)');
      expect(style).toContain('calc(50vw + var(--bottom-bar-width) / 2 - var(--bottom-fab-size))');
    });

    it('should show default icon', () => {
      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon).toBeTruthy();
    });
  });

  describe('telling the bar it is there', () => {
    it('should announce itself so the bar leaves room', () => {
      expect(TestBed.inject(BottomBar).hasFab()).toBe(true);
    });

    it('should take the announcement back when the page is left', () => {
      const bar = TestBed.inject(BottomBar);
      fixture.destroy();

      expect(bar.hasFab()).toBe(false);
    });
  });

  describe('icons', () => {
    it('should allow custom icons', () => {
      fixture.componentRef.setInput('icon', 'check');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon).toBeTruthy();
    });
  });

  describe('states', () => {
    it('should apply disabled state via input', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const hostElement = fixture.nativeElement;
      expect(hostElement.classList.contains('disabled:opacity-50')).toBe(true);
    });
  });
});
