import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateBar from './create-bar';

describe('CreateBar', () => {
  let component: CreateBar;
  let fixture: ComponentFixture<CreateBar>;
  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const barsStoreMock = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBar],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: BarsStore, useValue: barsStoreMock },
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
      const sectionTitle = fixture.nativeElement.querySelector('.heading-1');
      expect(sectionTitle).toBeTruthy();
    });

    it('should show badge text', () => {
      const badge = fixture.nativeElement.querySelector('.text-primary.tracking-\\[0\\.25em\\]');
      expect(badge).toBeTruthy();
    });

    it('should show create bar form', () => {
      const form = fixture.nativeElement.querySelector('[data-testid="create-bar-form"]');
      expect(form).toBeTruthy();
    });

    it('should show description text', () => {
      const description = fixture.nativeElement.querySelector('.text-on-surface-variant');
      expect(description).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should navigate to select bar on submit', () => {
      component['onSubmit']();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/bars/select']);
    });

    it('should navigate to select bar on cancel', () => {
      component['onCancel']();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/bars/select']);
    });
  });
});
