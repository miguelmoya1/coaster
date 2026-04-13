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
    fixture.componentRef.setInput('image', 'mock-url');
    fixture.componentRef.setInput('label', 'T');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
