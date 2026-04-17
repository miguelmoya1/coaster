import { ComponentFixture, TestBed } from '@angular/core/testing';
import Staff from './staff';

import { TranslateModule } from '@ngx-translate/core';
import { BarMembers } from '../../../../members';
import { signal } from '@angular/core';
import { CurrentUser } from '../../../../core';

import { vi } from 'vitest';

describe('Staff', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staff, TranslateModule.forRoot()],
      providers: [
        { provide: BarMembers, useValue: { list: { value: signal([]), isLoading: signal(false), hasValue: signal(true) }, setBarContext: vi.fn(), reload: vi.fn() } },
        { provide: CurrentUser, useValue: { current: { value: signal(null) } } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Staff);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
