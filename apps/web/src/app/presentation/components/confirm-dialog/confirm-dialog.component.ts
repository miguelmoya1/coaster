import { Component, booleanAttribute, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-confirm-dialog',
  imports: [MatIcon, MatButton, TranslatePipe, MatDialogTitle, MatDialogActions, MatDialogContent],
  template: `
    <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">
      {{ title() }}
    </h2>

    <mat-dialog-content>
      <div class="flex gap-8 p-4">
        @if (destructive()) {
          <div
            class="p-2 w-8 h-8 rounded-full mat-text-on-error-container mat-bg-error-container shrink-0 flex items-center justify-center"
          >
            <mat-icon>warning</mat-icon>
          </div>
        }

        <p class="text-on-surface-variant m-0 p-0 text-sm leading-relaxed whitespace-pre-wrap">
          {{ text() }}
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
      <button mat-button (click)="canceled.emit()">
        {{ cancelLabel() | translate }}
      </button>
      <button mat-flat-button (click)="deleted.emit()" [class]="destructive() ? 'warn' : ''">
        {{ (destructive() ? 'common.delete' : confirmLabel()) | translate }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly destructive = input(false, { transform: booleanAttribute });
  readonly title = input.required<string>();
  readonly text = input.required<string>();

  readonly cancelLabel = input('common.cancel');
  readonly confirmLabel = input('common.confirm');

  readonly canceled = output<void>();
  readonly deleted = output<void>();
}
