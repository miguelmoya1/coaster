import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdjustmentType } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddAdjustmentDialog, type AddAdjustmentResult } from './add-adjustment-dialog';

describe('AddAdjustmentDialog', () => {
  let fixture: ComponentFixture<AddAdjustmentDialog>;
  let confirmed: AddAdjustmentResult[];

  const apply = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAdjustmentDialog],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AddAdjustmentDialog);
    confirmed = [];
    fixture.componentInstance.confirmed.subscribe((result) => confirmed.push(result));
    fixture.detectChanges();
  });

  it('should hand the fixed amount over in cents', async () => {
    fixture.componentInstance.form.amount().value.set(5);
    fixture.detectChanges();

    await apply();

    expect(confirmed).toEqual([{ type: AdjustmentType.FIXED_AMOUNT, value: 500, reason: undefined }]);
  });

  it('should carry the reason when there is one', async () => {
    fixture.componentInstance.form.amount().value.set(5);
    fixture.componentInstance.form.reason().value.set('  Invitación  ');
    fixture.detectChanges();

    await apply();

    expect(confirmed).toEqual([{ type: AdjustmentType.FIXED_AMOUNT, value: 500, reason: 'Invitación' }]);
  });

  it('should refuse to apply an adjustment of zero', async () => {
    await apply();

    expect(confirmed).toEqual([]);
  });

  it('should refuse a percentage over a hundred', async () => {
    fixture.componentInstance.form.type().value.set(AdjustmentType.PERCENTAGE);
    fixture.componentInstance.form.percentage().value.set(120);
    fixture.detectChanges();

    await apply();

    expect(confirmed).toEqual([]);
  });

  it('should let a percentage the server would accept through', async () => {
    fixture.componentInstance.form.type().value.set(AdjustmentType.PERCENTAGE);
    fixture.componentInstance.form.percentage().value.set(10);
    fixture.detectChanges();

    await apply();

    expect(confirmed).toEqual([{ type: AdjustmentType.PERCENTAGE, value: 10, reason: undefined }]);
  });
});
