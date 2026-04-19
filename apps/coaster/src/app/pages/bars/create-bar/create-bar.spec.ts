import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { CreateBar as CreateBarService, MyBars } from '../../../bars';
import CreateBar from './create-bar';

describe('CreateBar', () => {
  let component: CreateBar;
  let fixture: ComponentFixture<CreateBar>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };
  const createBarMock = {
    execute: vi.fn().mockResolvedValue({}),
  };
  const myBarsMock = {
    reload: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: CreateBarService, useValue: createBarMock },
        { provide: MyBars, useValue: myBarsMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(CreateBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show section title', () => {
      const sectionTitle = fixture.nativeElement.querySelector('coaster-section-title');
      expect(sectionTitle).toBeTruthy();
    });

    it('should have a name input', () => {
      const input = fixture.nativeElement.querySelector('coaster-text-input');
      expect(input).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should navigate back on cancel', () => {
      component.cancel();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });

    it('should submit form and navigate on success', async () => {
      component.barForm.name().value.set('My New Bar');
      fixture.detectChanges();
      
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      submitButton.click();
      
      await fixture.whenStable();
      
      expect(createBarMock.execute).toHaveBeenCalledWith({ name: 'My New Bar' });
      expect(myBarsMock.reload).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });
  });
});
