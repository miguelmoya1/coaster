import { Component, booleanAttribute, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'coaster-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslateModule],
  template: `
    <div class="p-6 flex flex-col gap-4 max-w-md">
      <div class="flex items-start gap-4">
        @if (destructive()) {
          <div class="bg-error/15 p-3 rounded-full text-error shrink-0 flex items-center justify-center">
            <mat-icon>warning</mat-icon>
          </div>
        }
        <div class="flex flex-col gap-2">
          <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">
            {{ title() }}
          </h2>
          @if (subtitle()) {
            <p mat-dialog-content class="text-on-surface-variant m-0 p-0 text-sm font-medium">
              {{ subtitle() }}
            </p>
          }
          <p mat-dialog-content class="text-on-surface-variant m-0 p-0 text-sm leading-relaxed whitespace-pre-wrap">
            {{ text() }}
          </p>
        </div>
      </div>

      <div mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
        <button mat-stroked-button mat-dialog-close (click)="canceled.emit()">
          {{ cancel() || ('common.cancel' | translate) }}
        </button>
        <button
          mat-flat-button
          mat-dialog-close
          [color]="destructive() ? 'warn' : 'primary'"
          (click)="deleted.emit()"
        >
          {{ confirm() || (destructive() ? ('common.delete' | translate) : ('common.confirm' | translate)) }}
        </button>
      </div>
    </div>
  `,
  host: {
    class: 'block'
  }
})
export class ConfirmDialogComponent {
  destructive = input(false, { transform: booleanAttribute });
  title = input.required<string>();
  subtitle = input<string>();
  text = input.required<string>();

  cancel = input<string>();
  confirm = input<string>();

  canceled = output<void>();
  deleted = output<void>();
}
