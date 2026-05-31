import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { RosterNavigation } from './roster-navigation';
import { describe, expect, it, beforeEach } from 'vitest';

describe('RosterNavigation', () => {
  let component: RosterNavigation;
  let fixture: ComponentFixture<RosterNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterNavigation],
      providers: [
        provideTranslateService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterNavigation);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('displayMonthYear', 'MAY 2026');
    fixture.componentRef.setInput('viewMode', 'day');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the month/year label', () => {
    fixture.componentRef.setInput('displayMonthYear', 'JUNE 2026');
    fixture.componentRef.setInput('viewMode', 'week');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('span.text-on-surface-variant') as HTMLElement;
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('JUNE 2026');
  });

  it('should emit prev, next, today events when clicked', () => {
    fixture.componentRef.setInput('displayMonthYear', 'MAY 2026');
    fixture.componentRef.setInput('viewMode', 'day');
    fixture.detectChanges();

    let prevEmitted = false;
    let nextEmitted = false;
    let todayEmitted = false;

    component.prev.subscribe(() => { prevEmitted = true; });
    component.next.subscribe(() => { nextEmitted = true; });
    component.today.subscribe(() => { todayEmitted = true; });

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    const prevBtn = buttons[0] as HTMLButtonElement;
    const todayBtn = buttons[1] as HTMLButtonElement;
    const nextBtn = buttons[2] as HTMLButtonElement;

    prevBtn.click();
    expect(prevEmitted).toBe(true);

    todayBtn.click();
    expect(todayEmitted).toBe(true);

    nextBtn.click();
    expect(nextEmitted).toBe(true);
  });

  it('should emit viewChanged when a view mode segment is clicked', () => {
    fixture.componentRef.setInput('displayMonthYear', 'MAY 2026');
    fixture.componentRef.setInput('viewMode', 'day');
    fixture.detectChanges();

    let selectedView: 'day' | 'week' | 'month' | null = null;
    component.viewChanged.subscribe((v: 'day' | 'week' | 'month') => { selectedView = v; });

    const allButtons = fixture.nativeElement.querySelectorAll('button');
    const weekButton = Array.from(allButtons).find((btn) => 
      (btn as HTMLButtonElement).textContent?.includes('roster.views.week')
    ) as HTMLButtonElement;

    expect(weekButton).toBeTruthy();
    weekButton.click();
    expect(selectedView).toBe('week');
  });
});
