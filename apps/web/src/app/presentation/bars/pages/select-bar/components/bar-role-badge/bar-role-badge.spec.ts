import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarRole } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { BarRoleBadge } from './bar-role-badge';

describe('BarRoleBadge', () => {
  let fixture: ComponentFixture<BarRoleBadge>;
  let component: BarRoleBadge;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarRoleBadge],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(BarRoleBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('role input', () => {
    it('should default to undefined when no role is provided', () => {
      expect(component.role()).toBeUndefined();
    });

    it('should accept a role input', () => {
      fixture.componentRef.setInput('role', BarRole.OWNER);
      fixture.detectChanges();

      expect(component.role()).toBe(BarRole.OWNER);
    });
  });

  describe('dotColorClass computed', () => {
    it('should return default color when no role is provided', () => {
      expect(component.dotColorClass()).toContain('bg-primary');
      expect(component.dotColorClass()).toContain('text-primary');
    });

    it('should return primary colors for OWNER role', () => {
      fixture.componentRef.setInput('role', BarRole.OWNER);
      fixture.detectChanges();

      expect(component.dotColorClass()).toBe('bg-primary text-primary');
    });

    it('should return orange colors for STAFF role', () => {
      fixture.componentRef.setInput('role', BarRole.STAFF);
      fixture.detectChanges();

      expect(component.dotColorClass()).toBe('bg-orange-500 text-orange-500');
    });
  });

  describe('labelKey computed', () => {
    it('should return operational label when no role is provided', () => {
      expect(component.labelKey()).toBe('bars.select.operational');
    });

    it('should return owner label for OWNER role', () => {
      fixture.componentRef.setInput('role', BarRole.OWNER);
      fixture.detectChanges();

      expect(component.labelKey()).toBe('common.role.owner');
    });

    it('should return staff label for STAFF role', () => {
      fixture.componentRef.setInput('role', BarRole.STAFF);
      fixture.detectChanges();

      expect(component.labelKey()).toBe('common.role.staff');
    });
  });

  describe('rendering', () => {
    it('should render the badge container', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="bar-role-badge"]')).toBeTruthy();
    });

    it('should render the status dot', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="bar-role-badge-dot"]')).toBeTruthy();
    });

    it('should render the label', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="bar-role-badge-label"]')).toBeTruthy();
    });

    it('should apply dot color classes to the dot element', () => {
      fixture.componentRef.setInput('role', BarRole.STAFF);
      fixture.detectChanges();

      const dot = fixture.nativeElement.querySelector('[data-testid="bar-role-badge-dot"]');

      expect(dot.classList).toContain('bg-orange-500');
      expect(dot.classList).toContain('text-orange-500');
    });

    it('should update dot classes when role changes', () => {
      fixture.componentRef.setInput('role', BarRole.STAFF);
      fixture.detectChanges();

      const dot = fixture.nativeElement.querySelector('[data-testid="bar-role-badge-dot"]');
      expect(dot.classList).toContain('bg-orange-500');

      fixture.componentRef.setInput('role', BarRole.OWNER);
      fixture.detectChanges();

      expect(dot.classList).toContain('bg-primary');
      expect(dot.classList).toContain('text-primary');
    });
  });
});
