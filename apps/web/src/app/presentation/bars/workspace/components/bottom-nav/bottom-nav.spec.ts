import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomNav } from './bottom-nav';

// TODO: (@angular/aria >=22) Testear con ToolbarHarness de @angular/aria/toolbar-testing (widgets de navegación, orientación)
describe('BottomNav', () => {
  let component: BottomNav;
  let fixture: ComponentFixture<BottomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav, TranslateModule.forRoot()],
      providers: [provideRouter([])],
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
