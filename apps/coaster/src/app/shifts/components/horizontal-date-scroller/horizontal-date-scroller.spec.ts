import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizontalDateScroller } from './horizontal-date-scroller';

// TODO: (@angular/aria >=22) Enriquecer tests con ListboxHarness de @angular/aria/listbox-testing (orientación, selección de día)
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
