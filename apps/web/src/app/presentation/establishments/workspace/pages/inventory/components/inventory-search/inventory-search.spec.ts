import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { InventorySearch } from './inventory-search';

describe('InventorySearch', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventorySearch],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(InventorySearch);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('should render the search icon inside the field', () => {
    expect(element.querySelector('.mat-mdc-form-field-icon-prefix')).not.toBeNull();
  });
});
