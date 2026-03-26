import { ComponentFixture, TestBed } from '@angular/core/testing';
import Staff from './staff';

describe('Staff', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staff],
    }).compileComponents();

    fixture = TestBed.createComponent(Staff);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
