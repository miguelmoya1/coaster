import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusCard, StatusLevel } from './status-card';

describe('StatusCard', () => {
  let component: StatusCard;
  let fixture: ComponentFixture<StatusCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should have base host classes', () => {
      const hostElement = fixture.nativeElement;
      expect(hostElement.classList.contains('bg-surface-container-high')).toBe(true);
      expect(hostElement.classList.contains('rounded-xl')).toBe(true);
    });

    it('should not show status indicator by default', () => {
      const indicator = fixture.nativeElement.querySelector('div');
      expect(indicator).toBeNull();
    });
  });

  describe('status levels', () => {
    const levels: { level: StatusLevel; expectedClass: string }[] = [
      { level: 'error', expectedClass: 'bg-error' },
      { level: 'warning', expectedClass: 'bg-tertiary' },
      { level: 'success', expectedClass: 'bg-secondary' },
      { level: 'primary', expectedClass: 'bg-primary' },
    ];

    levels.forEach(({ level, expectedClass }) => {
      it(`should show ${level} status indicator with ${expectedClass} class`, () => {
        fixture.componentRef.setInput('status', level);
        fixture.detectChanges();

        const indicator = fixture.nativeElement.querySelector('div');
        expect(indicator).toBeTruthy();
        expect(indicator.className).toContain(expectedClass);
      });
    });
  });
});
