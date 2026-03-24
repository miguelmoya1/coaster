import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusCard } from './status-card';

describe('StatusCard', () => {
  let component: StatusCard;
  let fixture: ComponentFixture<StatusCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusCard]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatusCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
