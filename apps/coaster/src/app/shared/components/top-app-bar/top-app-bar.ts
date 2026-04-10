import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { AvatarBadge } from '../avatar-badge/avatar-badge';
import { CoasterTitle } from '../typography/typography';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [AvatarBadge, NgIcon, Toolbar, ToolbarWidget, CoasterTitle],
  viewProviders: [provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <header
      ngToolbar
      class="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-elevated"
    >
      <div class="flex items-center gap-3">
        @if (image(); as image) {
          <coaster-avatar-badge [imageSrc]="image" altText="User profile" />
        }
        <h1 coaster-title>
          {{ label() }}
        </h1>
      </div>
      <div class="flex items-center gap-4">
        <ng-content select="[actions]"></ng-content>
        <button
          ngToolbarWidget
          value="search"
          class="p-2 rounded-full hover:bg-surface-bright transition-colors active:scale-95 duration-200 text-on-surface-variant flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100"
        >
          <ng-icon name="lucideSearch" class="text-xl" />
        </button>
      </div>
    </header>
  `,
})
export class TopAppBar {
  readonly label = input.required<string>();
  readonly image = input.required<string>();
}
