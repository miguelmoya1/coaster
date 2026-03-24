import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrimaryButton } from './primary-button';

describe('PrimaryButton', () => {
  let component: PrimaryButton;
  let fixture: ComponentFixture<PrimaryButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryButton]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrimaryButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
