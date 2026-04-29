import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizontalDateScroller, ScrollerDay } from './horizontal-date-scroller';

// TODO: (@angular/aria >=22) Enriquecer tests con ListboxHarness de @angular/aria/listbox-testing (orientación, selección de día)
describe('HorizontalDateScroller', () => {
  let component: HorizontalDateScroller;
  let fixture: ComponentFixture<HorizontalDateScroller>;

  const mockDays: ScrollerDay[] = [
    { id: '2026-03-01', dayName: 'Sun', dayNumber: 1, isActive: false },
    { id: '2026-03-02', dayName: 'Mon', dayNumber: 2, isActive: true },
    { id: '2026-03-03', dayName: 'Tue', dayNumber: 3, isActive: false },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizontalDateScroller],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizontalDateScroller);
    component = fixture.componentInstance;
    
    fixture.componentRef.setInput('days', mockDays);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display all days provided', () => {
      const dayElements = fixture.nativeElement.querySelectorAll('[ngOption]');
      expect(dayElements.length).toBe(3);
      expect(dayElements[0].textContent).toContain('Sun');
      expect(dayElements[0].textContent).toContain('1');
    });

    it('should apply active styles to the active day', () => {
      const dayElements = fixture.nativeElement.querySelectorAll('[ngOption]');
      expect(dayElements[1].classList.contains('bg-primary-container')).toBe(true);
      expect(dayElements[0].classList.contains('bg-surface-container-low')).toBe(true);
    });
  });

  describe('actions', () => {
    it('should emit daySelected when a day is clicked', () => {
      const spy = vi.spyOn(component.daySelected, 'emit');
      const dayElements = fixture.nativeElement.querySelectorAll('[ngOption]');
      
      dayElements[2].click();
      
      expect(spy).toHaveBeenCalledWith('2026-03-03');
    });
  });

  describe('states', () => {
    it('should apply disabled styles and attributes when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      
      const scroller = fixture.nativeElement.querySelector('[ngListbox]');
      expect(scroller.classList.contains('opacity-50')).toBe(true);
      expect(scroller.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
