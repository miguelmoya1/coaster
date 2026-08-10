import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PosSearch } from './pos-search';

describe('PosSearch', () => {
  let component: PosSearch;
  let fixture: ComponentFixture<PosSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosSearch],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PosSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update query model on input', () => {
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'test query';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.query()).toBe('test query');
  });

  it('should clear query when clicking close button', () => {
    component.query.set('some value');
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('button');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    fixture.detectChanges();

    expect(component.query()).toBe('');
  });
});
