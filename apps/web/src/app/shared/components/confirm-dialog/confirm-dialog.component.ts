import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn } from '../button/button';
import { DialogComponent } from '../dialog/dialog.component';
import { CoasterTitle } from '../typography/typography';

@Component({
  selector: 'coaster-confirm-dialog',
  imports: [NgIcon, TranslatePipe, DialogComponent, CoasterTitle, CoasterBtn],
  providers: [provideIcons({ lucideAlertTriangle })],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="cancel()">
      <div
        class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-xl w-[90vw] outline-none flex flex-col gap-4"
      >
        <div class="flex items-start gap-3">
          @if (isDestructive()) {
            <div class="bg-error/10 p-2 rounded-full text-error shrink-0 mt-0.5 flex items-center justify-center">
              <ng-icon name="lucideAlertTriangle" size="20" />
            </div>
          }
          <div class="flex flex-col gap-1">
            <h2 coaster-title>
              <ng-content select="[confirm-dialog-title]" />
            </h2>
            <p class="text-on-surface-variant">
              <ng-content select="[confirm-dialog-message]" />
            </p>
          </div>
        </div>

        <ng-content select="[confirm-dialog-extra]" />

        <div class="flex justify-end gap-2 mt-2">
          <button coaster-btn variant="outline" (click)="cancel()">
            {{ cancelLabel() | translate }}
          </button>
          <button coaster-btn [variant]="isDestructive() ? 'error' : 'primary'" (click)="confirm()">
            {{ confirmLabel() | translate }}
          </button>
        </div>
      </div>
    </coaster-dialog>
  `,
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  public readonly cancelLabel = input('common.cancel');
  public readonly confirmLabel = input('common.confirm');

  public readonly isOpen = input.required<boolean>();

  public readonly isDestructive = input(false, { transform: booleanAttribute });

  public readonly confirmed = output<void>();
  public readonly cancelled = output<void>();

  protected cancel() {
    this.cancelled.emit();
  }

  protected confirm() {
    this.confirmed.emit();
  }
}
