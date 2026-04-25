import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Tab, Tabs } from './tabs';

describe('Tabs', () => {
  let fixture: ComponentFixture<Tabs<unknown>>;
  let component: Tabs<unknown>;
  const mockTabs: Tab<unknown>[] = [
    { id: 'tab-1', label: 'Tapas' },
    { id: 'tab-2', label: 'Cocktails' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tabs],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(Tabs);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('tabs', mockTabs);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('tabs input', () => {
    it('should expose the tabs signal with the provided value', () => {
      expect(component.tabs()).toEqual(mockTabs);
    });

    it('should default to an empty array when no tabs are provided', () => {
      fixture.componentRef.setInput('tabs', []);
      fixture.detectChanges();

      expect(component.tabs()).toEqual([]);
    });

    it('should render tab buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');

      expect(buttons.length).toBe(mockTabs.length);
    });

    it('should render tab labels', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');

      expect(buttons[0]?.textContent.trim()).toBe('Tapas');
      expect(buttons[1]?.textContent.trim()).toBe('Cocktails');
    });

    it('should update tabs when input changes', () => {
      const updatedTabs: Tab<unknown>[] = [{ id: 'tab-3', label: 'Wines' }];
      fixture.componentRef.setInput('tabs', updatedTabs);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');

      expect(buttons.length).toBe(1);
      expect(buttons[0]?.textContent.trim()).toBe('Wines');
    });
  });

  describe('selectedTabId input', () => {
    it('should default to undefined when no selectedTabId is provided', () => {
      expect(component.selectedTabId()).toBeUndefined();
    });

    it('should accept a selectedTabId input', () => {
      fixture.componentRef.setInput('selectedTabId', 'tab-1');
      fixture.detectChanges();

      expect(component.selectedTabId()).toBe('tab-1');
    });
  });

  describe('disabled input', () => {
    it('should default to false', () => {
      expect(component.disabled()).toBe(false);
    });

    it('should accept a disabled input', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(component.disabled()).toBe(true);
    });
  });

  describe('selectTab', () => {
    it('should emit tabSelected when selectTab is called', () => {
      const spy = vi.fn();
      component.tabSelected.subscribe(spy);

      component.selectTab('tab-1');

      expect(spy).toHaveBeenCalledWith('tab-1');
    });

    it('should emit tabSelected when a tab button is clicked', () => {
      const spy = vi.fn();
      component.tabSelected.subscribe(spy);

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[1]?.click();

      expect(spy).toHaveBeenCalledWith('tab-2');
    });
  });
});
