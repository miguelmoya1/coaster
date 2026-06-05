import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { beforeEach, describe, expect, it } from 'vitest';
import { Fab } from './fab';

describe('Fab', () => {
  let component: Fab;
  let fixture: ComponentFixture<Fab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fab, NgIcon],
      providers: [provideIcons({ lucideCheck })],
    }).compileComponents();

    fixture = TestBed.createComponent(Fab);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should have correct host classes', () => {
      const hostElement = fixture.nativeElement;
      expect(hostElement.classList.contains('fixed')).toBe(true);
      expect(hostElement.classList.contains('rounded-2xl')).toBe(true);
      expect(hostElement.classList.contains('bg-linear-to-br')).toBe(true);
    });

    it('should show default icon', () => {
      const icon = fixture.nativeElement.querySelector('ng-icon');
      expect(icon).toBeTruthy();
      // Since it's a dynamic name, we mainly check it exists.
    });
  });

  describe('icons', () => {
    it('should allow custom icons', () => {
      fixture.componentRef.setInput('icon', 'lucideCheck');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('ng-icon');
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
