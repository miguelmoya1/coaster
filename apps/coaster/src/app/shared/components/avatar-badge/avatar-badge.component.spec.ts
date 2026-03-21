import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarBadgeComponent } from './avatar-badge.component';

describe('AvatarBadgeComponent', () => {
  let component: AvatarBadgeComponent;
  let fixture: ComponentFixture<AvatarBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarBadgeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvatarBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('imageSrc', 'test.jpg');
    fixture.componentRef.setInput('altText', 'Test');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
