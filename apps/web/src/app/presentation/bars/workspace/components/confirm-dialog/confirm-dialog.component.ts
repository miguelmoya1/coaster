import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { CoasterTitle } from '../../../../components/typography/typography';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'coaster-confirm-dialog',
  imports: [NgIcon, TranslatePipe, DialogComponent, CoasterTitle, MatButton],
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
              @if (title()) {
                {{ title() | translate }}
              }
            </h2>
            <p class="text-on-surface-variant">
              <ng-content select="[confirm-dialog-message]" />
              @if (message()) {
                {{ message() | translate }}
              }
            </p>
          </div>
        </div>

        <ng-content select="[confirm-dialog-extra]" />

        <div class="flex justify-end gap-2 mt-2">
          <button mat-stroked-button class="h-16 w-full" (click)="cancel()">
            {{ cancelLabel() | translate }}
          </button>
          <button
            mat-flat-button
            class="h-16 w-full"
            [class.text-error]="isDestructive()"
            [class.bg-error-container]="isDestructive()"
            (click)="confirm()"
          >
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
  public readonly title = input<string>();
  public readonly message = input<string>();
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
