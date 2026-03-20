import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
@Component({
  selector: 'coaster-fab',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucidePlus })],
  template: `
    <button
      class="fixed right-6 bottom-24 w-16 h-16 bg-linear-to-br from-primary to-primary-container text-on-primary-fixed rounded-2xl shadow-elevated flex items-center justify-center active:scale-95 transition-all z-40 cursor-pointer"
    >
      <ng-icon [name]="icon()!" class="text-3xl font-bold"></ng-icon>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FabComponent {
  readonly icon = input('lucidePlus');
}
