import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBarForm } from './components/create-bar-form';
import CreateBar from './create-bar';

describe('CreateBar', () => {
  let component: CreateBar;
  let fixture: ComponentFixture<CreateBar>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        {
          provide: Auth,
          useValue: {},
        },
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
      const sectionTitle = fixture.debugElement.query(By.css('coaster-section-title'));
      expect(sectionTitle).toBeTruthy();
    });

    it('should show create bar form', () => {
      const createBarForm = fixture.debugElement.query(By.css('[data-testid="create-bar-form"]'))
        .componentInstance as CreateBarForm;
      expect(createBarForm).toBeTruthy();
    });
  });

  describe('onSubmit', () => {
    it('should navigate to select bar', () => {
      const createBarForm = fixture.debugElement.query(By.css('[data-testid="create-bar-form"]'))
        .componentInstance as CreateBarForm;
      createBarForm.formSubmitted.emit();

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });
  });

  describe('onCancel', () => {
    it('should navigate to select bar', () => {
      const createBarForm = fixture.debugElement.query(By.css('[data-testid="create-bar-form"]'))
        .componentInstance as CreateBarForm;
      createBarForm.formCancelled.emit();

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars/select']);
    });
  });
});
