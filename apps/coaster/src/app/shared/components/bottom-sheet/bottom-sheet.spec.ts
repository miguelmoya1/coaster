import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomSheet } from './bottom-sheet';

describe('BottomSheet', () => {
  let component: BottomSheet;
  let fixture: ComponentFixture<BottomSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheet],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
