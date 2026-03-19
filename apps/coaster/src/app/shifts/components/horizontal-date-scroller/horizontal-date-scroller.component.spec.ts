import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizontalDateScrollerComponent } from './horizontal-date-scroller.component';

describe('HorizontalDateScrollerComponent', () => {
  let component: HorizontalDateScrollerComponent;
  let fixture: ComponentFixture<HorizontalDateScrollerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizontalDateScrollerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizontalDateScrollerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
