import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdjustmentType } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddAdjustmentDialog, type AddAdjustmentResult } from './add-adjustment-dialog';

describe('AddAdjustmentDialog', () => {
  let fixture: ComponentFixture<AddAdjustmentDialog>;
  let confirmed: AddAdjustmentResult[];

  const reasonInput = () => fixture.nativeElement.querySelector('input[enterkeyhint]') as HTMLInputElement;

  const pressEnter = () => {
    reasonInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
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

  it('should apply the adjustment when enter is pressed on the reason', () => {
    fixture.componentInstance.valueCents.set(500);
    fixture.detectChanges();

    pressEnter();

    expect(confirmed).toEqual([{ type: AdjustmentType.FIXED_AMOUNT, value: 500, reason: undefined }]);
  });

  it('should refuse to apply an adjustment of zero', () => {
    pressEnter();

    expect(confirmed).toEqual([]);
  });
});
