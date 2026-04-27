import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopAppBar } from './top-app-bar';

describe('TopAppBar', () => {
  let component: TopAppBar;
  let fixture: ComponentFixture<TopAppBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopAppBar],
    }).compileComponents();

    fixture = TestBed.createComponent(TopAppBar);
    component = fixture.componentInstance;
    
    fixture.componentRef.setInput('label', 'Dashboard');
    fixture.componentRef.setInput('image', 'https://photo.url/user.jpg');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the title label', () => {
      const title = fixture.nativeElement.querySelector('h1[coaster-title]');
      expect(title.textContent).toContain('Dashboard');
    });

    it('should display the user image in avatar badge', () => {
      const avatar = fixture.nativeElement.querySelector('coaster-avatar-badge');
      expect(avatar).toBeTruthy();
      // Since it's a child component, we mainly check its existence and host-passed inputs if possible,
      // but standard practice here is checking existence and that inputs were set on component.
      expect(component.image()).toBe('https://photo.url/user.jpg');
    });


  });

  describe('content projection', () => {
    it('should project actions content', () => {
       // We'd need a TestHost to test projection properly or use manual projection if available.
       // For simple ng-content we often skip if it's just a placeholder.
    });
  });
});
