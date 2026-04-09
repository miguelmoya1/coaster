import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoasterBtn } from './button';

@Component({
  standalone: true,
  imports: [CoasterBtn],
  template: `<button coaster-btn>Test</button>`,
})
class TestHost {}

describe('CoasterBtn', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('should create', () => {
    const button = fixture.nativeElement.querySelector('button[coaster-btn]');
    expect(button).toBeTruthy();
  });

  it('should apply primary classes by default', () => {
    const button = fixture.nativeElement.querySelector('button[coaster-btn]') as HTMLElement;
    expect(button.classList.contains('from-primary')).toBe(true);
  });
});
