import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstablishmentSubscriptionStore } from '../../store/establishment-subscription.store';
import { SelectPlanDialog } from './select-plan-dialog';

describe('SelectPlanDialog', () => {
  let component: SelectPlanDialog;
  let fixture: ComponentFixture<SelectPlanDialog>;

  const seatSummary = signal<Record<string, number> | undefined>(undefined);

  const summaryOf = (used: number) => ({
    used,
    billed: used,
    included: 10,
    basePriceCents: 1999,
    extraPriceCents: 200,
    extraSeats: Math.max(0, used - 10),
    monthlyTotalCents: 1999 + Math.max(0, used - 10) * 200,
  });

  beforeEach(async () => {
    seatSummary.set(undefined);

    await TestBed.configureTestingModule({
      imports: [SelectPlanDialog],
      providers: [
        provideTranslateService(),
        { provide: EstablishmentSubscriptionStore, useValue: { seatSummary } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectPlanDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show no price breakdown until the seats are known', () => {
    expect(component['seats']()).toBeUndefined();
  });

  it('should charge the flat price to a venue inside its allowance', async () => {
    seatSummary.set(summaryOf(4));
    await fixture.whenStable();

    expect(component['seats']()?.monthlyTotal).toBe('19,99\u00A0€');
    expect(fixture.nativeElement.textContent).toContain('billing.seats.breakdown_within');
  });

  it('should bill the eleventh employee as one extra seat', async () => {
    seatSummary.set(summaryOf(11));
    await fixture.whenStable();

    expect(component['seats']()?.monthlyTotal).toBe('21,99\u00A0€');
    expect(fixture.nativeElement.textContent).toContain('billing.seats.breakdown_over');
  });

  it('should add two euros per employee past the allowance', async () => {
    seatSummary.set(summaryOf(20));
    await fixture.whenStable();

    expect(component['seats']()?.monthlyTotal).toBe('39,99\u00A0€');
    expect(component['seats']()?.extraSeats).toBe(10);
  });
});
