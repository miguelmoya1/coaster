import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryTabsComponent } from './category-tabs.component';

describe('CategoryTabsComponent', () => {
  let component: CategoryTabsComponent;
  let fixture: ComponentFixture<CategoryTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryTabsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategoryTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
