import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizontalDateScroller } from './horizontal-date-scroller';

describe('HorizontalDateScroller', () => {
  let component: HorizontalDateScroller;
  let fixture: ComponentFixture<HorizontalDateScroller>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizontalDateScroller],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizontalDateScroller);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
