import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryTabs } from './category-tabs';

describe('CategoryTabs', () => {
  let component: CategoryTabs;
  let fixture: ComponentFixture<CategoryTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryTabs]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategoryTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
