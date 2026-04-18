import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-fab',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucidePlus })],
  host: {
    class:
      'fixed right-6 bottom-24 w-16 h-16 bg-linear-to-br from-primary to-primary-container text-on-primary-fixed rounded-2xl shadow-elevated flex items-center justify-center active:scale-95 transition-all z-40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
    role: 'button',
  },
  template: `<ng-icon [name]="icon()" class="text-3xl font-bold" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fab {
  readonly icon = input('lucidePlus');
  readonly disabled = input(false);
}
