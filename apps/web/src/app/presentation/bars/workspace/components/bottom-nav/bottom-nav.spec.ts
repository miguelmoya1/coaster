import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideChildTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import { MyMemberStore } from '@coaster/bars';

// TODO: (@angular/aria >=22) Testear con ToolbarHarness de @angular/aria/toolbar-testing (widgets de navegación, orientación)
describe('BottomNav', () => {
  let component: BottomNav;
  let fixture: ComponentFixture<BottomNav>;

  const myMemberStoreMock = {
    hasPermission: vi.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [
        provideRouter([]),
        provideChildTranslateService(),
        { provide: MyMemberStore, useValue: myMemberStoreMock }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
