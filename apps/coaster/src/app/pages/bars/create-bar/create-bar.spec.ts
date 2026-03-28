import { ComponentFixture, TestBed } from '@angular/core/testing';
import CreateBar from './create-bar';

describe('CreateBar', () => {
  let component: CreateBar;
  let fixture: ComponentFixture<CreateBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBar],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
