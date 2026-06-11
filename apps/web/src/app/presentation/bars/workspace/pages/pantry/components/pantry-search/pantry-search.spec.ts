import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PantrySearch } from './pantry-search';

describe('PantrySearch', () => {
  let fixture: ComponentFixture<PantrySearch>;
  let component: PantrySearch;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantrySearch],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PantrySearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should sync input element changes to query model', async () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Ron';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.query()).toBe('Ron');
  });

  it('should sync query model changes to input element', async () => {
    component.query.set('Ginebra');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Ginebra');
  });
});
