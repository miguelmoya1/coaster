import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SelectInput, SelectOption } from './select-input';

describe('SelectInput', () => {
  let component: SelectInput;
  let fixture: ComponentFixture<SelectInput>;

  const mockOptions: SelectOption[] = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectInput, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show label if provided', () => {
      fixture.componentRef.setInput('label', 'Choice');
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('Choice');
    });

    it('should show placeholder when no value is selected', () => {
      fixture.componentRef.setInput('placeholder', 'Pick one');
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector('button');
      expect(trigger.textContent).toContain('Pick one');
    });

    it('should show display value when an option is selected', () => {
      fixture.componentRef.setInput('value', '1');
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector('button');
      expect(trigger.textContent).toContain('Option 1');
    });
  });

  describe('actions', () => {
    it('should toggle isOpen state on click', () => {
      const trigger = fixture.nativeElement.querySelector('button');
      trigger.click();
      expect(component.isOpen()).toBe(true);
      
      trigger.click();
      expect(component.isOpen()).toBe(false);
    });

    it('should set touched on blur', () => {
      const trigger = fixture.nativeElement.querySelector('button');
      trigger.dispatchEvent(new Event('blur'));
      expect(component.touched()).toBe(true);
    });
  });

  describe('states', () => {
    it('should apply border-error when invalid', () => {
      fixture.componentRef.setInput('invalid', true);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector('button');
      expect(trigger.classList.contains('border-error')).toBe(true);
    });

    it('should disable the trigger button', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector('button');
      expect(trigger.classList.contains('opacity-50')).toBe(true);
      expect(trigger.classList.contains('pointer-events-none')).toBe(true);
    });
  });
});
