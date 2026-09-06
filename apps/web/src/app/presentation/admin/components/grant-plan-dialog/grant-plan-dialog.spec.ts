import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { GrantPlanDialog, type GrantPlanResult } from './grant-plan-dialog';

describe('GrantPlanDialog', () => {
  let fixture: ComponentFixture<GrantPlanDialog>;
  let confirmed: GrantPlanResult[];

  const grant = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrantPlanDialog],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(GrantPlanDialog);
    fixture.componentRef.setInput('establishmentName', 'El Establishment');
    confirmed = [];
    fixture.componentInstance.confirmed.subscribe((result) => confirmed.push(result));
    fixture.detectChanges();
  });

  it('should offer a month by default', async () => {
    await grant();

    expect(confirmed).toEqual([{ durationDays: 30, reason: '' }]);
  });

  it('should carry a grant that never expires as no duration at all', async () => {
    fixture.componentInstance.form.durationDays().value.set(null);
    fixture.detectChanges();

    await grant();

    expect(confirmed).toEqual([{ durationDays: null, reason: '' }]);
  });

  it('should trim the reason', async () => {
    fixture.componentInstance.form.reason().value.set('  Compensación  ');
    fixture.detectChanges();

    await grant();

    expect(confirmed).toEqual([{ durationDays: 30, reason: 'Compensación' }]);
  });

  it('should refuse a reason longer than the column allows', async () => {
    fixture.componentInstance.form.reason().value.set('x'.repeat(281));
    fixture.detectChanges();

    await grant();

    expect(confirmed).toEqual([]);
  });
});
