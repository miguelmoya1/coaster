import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionStore } from '../../bars/store/bar-subscription.store';
import { PlanDialogService } from '../../presentation/bars/workspace/services/plan-dialog.service';
import { RequireSubscriptionDirective } from './require-subscription.directive';

@Component({
  standalone: true,
  imports: [RequireSubscriptionDirective],
  template: `<button coasterRequireSubscription (click)="onAction()">Click Me</button>`,
})
class TestComponent {
  actionCalled = false;
  onAction() {
    this.actionCalled = true;
  }
}

describe('RequireSubscriptionDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  const isReadOnlySignal = signal(false);
  let planDialogServiceMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    isReadOnlySignal.set(false);
    planDialogServiceMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        {
          provide: BarSubscriptionStore,
          useValue: {
            isReadOnly: isReadOnlySignal,
          },
        },
        {
          provide: PlanDialogService,
          useValue: planDialogServiceMock,
        },
      ],
    });

    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
  });

  it('should allow normal click when not read-only', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(false);

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.actionCalled).toBe(true);
    expect(planDialogServiceMock.open).not.toHaveBeenCalled();
  });

  it('should disable button and open plan dialog when read-only', () => {
    isReadOnlySignal.set(true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('opacity-60')).toBe(true);

    const event = new MouseEvent('click', { cancelable: true });
    button.dispatchEvent(event);
    fixture.detectChanges();

    expect(planDialogServiceMock.open).toHaveBeenCalled();
  });
});
