import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-fab',
  imports: [MatIcon],
  host: {
    class:
      'fixed right-6 bottom-24 w-16 h-16 bg-linear-to-br from-primary to-primary-container text-on-primary-fixed rounded-2xl shadow-elevated flex items-center justify-center active:scale-95 transition-all z-40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
    role: 'button',
  },
  template: `<mat-icon class="text-3xl font-bold">{{ icon() }}</mat-icon>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fab {
  readonly icon = input('add');
  readonly disabled = input(false);
}
