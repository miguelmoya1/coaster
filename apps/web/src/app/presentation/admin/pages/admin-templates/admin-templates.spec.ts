import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { provideRouter, Router } from '@angular/router';
import { ActionFeedback } from '@coaster/core';
import { TemplatesStore } from '@coaster/templates';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTemplates } from './admin-templates';

describe('AdminTemplates', () => {
  let component: AdminTemplates;
  let fixture: ComponentFixture<AdminTemplates>;

  const httpMock = {
    post: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const feedbackMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  const templatesStoreMock = {
    reloadTemplates: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTemplates],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: HttpClient, useValue: httpMock },
        { provide: Router, useValue: routerMock },
        { provide: ActionFeedback, useValue: feedbackMock },
        { provide: TemplatesStore, useValue: templatesStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(AdminTemplates);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be invalid initially', () => {
    expect(component.form().invalid()).toBe(true);
  });

  it('should load standard templates and show toast', () => {
    component.loadStandardTemplates();
    expect(component.form.jsonContent().value()).toContain('Cafetería');
    expect(feedbackMock.info).toHaveBeenCalled();
  });

  it('should navigate back', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  describe('validation', () => {
    it('should be invalid for empty JSON', () => {
      component.form.jsonContent().value.set('');
      fixture.detectChanges();
      expect(component.form.jsonContent().invalid()).toBe(true);
    });

    it('should be invalid for non-array JSON', () => {
      component.form.jsonContent().value.set('{"key": "value"}');
      fixture.detectChanges();
      expect(component.form.jsonContent().invalid()).toBe(true);
    });

    it('should be invalid for malformed JSON', () => {
      component.form.jsonContent().value.set('[invalid-json]');
      fixture.detectChanges();
      expect(component.form.jsonContent().invalid()).toBe(true);
    });

    it('should be valid for correct array JSON', () => {
      component.form.jsonContent().value.set('[]');
      fixture.detectChanges();
      expect(component.form.jsonContent().valid()).toBe(true);
    });
  });

  describe('submission', () => {
    it('should submit successfully', async () => {
      httpMock.post.mockReturnValue(of({}));
      component.form.jsonContent().value.set('[]');
      fixture.detectChanges();

      await submit(component.form);

      expect(httpMock.post).toHaveBeenCalledWith('/templates/bulk', []);
      expect(feedbackMock.success).toHaveBeenCalled();
      expect(templatesStoreMock.reloadTemplates).toHaveBeenCalled();
      expect(component.form.jsonContent().value()).toBe('');
    });

    it('should handle submission errors', async () => {
      const errorResponse = { message: 'Failed to update' };
      httpMock.post.mockReturnValue(throwError(() => errorResponse));
      component.form.jsonContent().value.set('[]');
      fixture.detectChanges();

      await submit(component.form);

      expect(httpMock.post).toHaveBeenCalled();
      expect(feedbackMock.error).toHaveBeenCalled();
    });
  });
});
