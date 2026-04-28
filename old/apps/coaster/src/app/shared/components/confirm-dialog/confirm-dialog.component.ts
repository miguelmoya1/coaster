import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive?: boolean;
}

@Component({
  selector: 'coaster-confirm-dialog',
  imports: [NgIcon, TranslatePipe],
  providers: [provideIcons({ lucideAlertTriangle })],
  template: `
    <div
      class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-[320px] w-[90vw] outline-none flex flex-col gap-4"
    >
      <div class="flex items-start gap-3">
        @if (data.isDestructive) {
          <div class="bg-error/10 p-2 rounded-full text-error shrink-0 mt-0.5">
            <ng-icon name="lucideAlertTriangle" size="20"></ng-icon>
          </div>
        }
        <div class="flex flex-col gap-1">
          <h2 class="text-[1.1rem] font-semibold text-on-surface leading-tight">{{ data.title }}</h2>
          <p class="text-on-surface-variant text-sm leading-relaxed mt-1">{{ data.message }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-2">
        <button
          class="px-5 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-bright transition-colors"
          (click)="dialogRef.close(false)"
        >
          {{ data.cancelText | translate }}
        </button>
        <button
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          [class.bg-error]="data.isDestructive"
          [class.text-on-surface]="data.isDestructive"
          [class.hover:bg-error/90]="data.isDestructive"
          [class.bg-primary]="!data.isDestructive"
          [class.text-on-primary]="!data.isDestructive"
          [class.hover:bg-primary/90]="!data.isDestructive"
          (click)="dialogRef.close(true)"
        >
          {{ data.confirmText | translate }}
        </button>
      </div>
    </div>
  `,
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  dialogRef = inject(DialogRef<boolean>);
  data = inject<ConfirmDialogData>(DIALOG_DATA);
}
