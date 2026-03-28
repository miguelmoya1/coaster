import { ComponentFixture, TestBed } from '@angular/core/testing';
import SelectBar from './select-bar';

describe('SelectBar', () => {
  let component: SelectBar;
  let fixture: ComponentFixture<SelectBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBar],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
