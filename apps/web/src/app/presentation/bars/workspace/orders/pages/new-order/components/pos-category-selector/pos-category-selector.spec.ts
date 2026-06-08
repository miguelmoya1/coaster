import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category } from '@coaster/common';
import { asBarId, asCategoryId } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PosCategorySelector } from './pos-category-selector';

describe('PosCategorySelector', () => {
  let component: PosCategorySelector;
  let fixture: ComponentFixture<PosCategorySelector>;

  const mockCategories: Category[] = [
    { id: asCategoryId('cat-1'), name: 'templates.categories.cafeteria', barId: asBarId('bar-1') },
    { id: asCategoryId('cat-2'), name: 'templates.categories.refrescos', barId: asBarId('bar-1') },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCategorySelector],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PosCategorySelector);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', mockCategories);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all category tabs including ALL', () => {
    const chips = fixture.nativeElement.querySelectorAll('mat-chip-option');
    expect(chips.length).toBe(3); // 'ALL' + 2 mock categories
  });

  it('should change selectedCategory model on chip click', async () => {
    const chips = fixture.nativeElement.querySelectorAll('mat-chip-option');
    const firstCatChip = chips[1];
    const clickable = firstCatChip.querySelector('button') || firstCatChip.querySelector('.mdc-evolution-chip__action') || firstCatChip;

    clickable.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedCategory()).toBe('cat-1');
  });

  it('should prevent deselecting current category', async () => {
    component.selectedCategory.set('cat-1');
    fixture.detectChanges();
    await fixture.whenStable();

    // Click it again to deselect
    const chips = fixture.nativeElement.querySelectorAll('mat-chip-option');
    const firstCatChip = chips[1];
    const clickable = firstCatChip.querySelector('button') || firstCatChip.querySelector('.mdc-evolution-chip__action') || firstCatChip;

    clickable.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Should still be 'cat-1'
    expect(component.selectedCategory()).toBe('cat-1');
  });
});
