import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { AvatarBadgeComponent } from '../avatar-badge/avatar-badge.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [AvatarBadgeComponent, NgIcon, Toolbar, ToolbarWidget],
  viewProviders: [provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      ngToolbar
      class="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-elevated"
    >
      <div class="flex items-center gap-3">
        @if (userImage()) {
          <coaster-avatar-badge
            [imageSrc]="userImage()!"
            altText="User profile"
          ></coaster-avatar-badge>
        }
        <h1 class="text-primary font-black italic tracking-tighter headline-lg">
          {{ title() }}
        </h1>
      </div>
      <div class="flex items-center gap-4">
        <ng-content select="[actions]"></ng-content>
        <button
          ngToolbarWidget
          value="search"
          [disabled]="disabled()"
          class="p-2 rounded-full hover:bg-surface-bright transition-colors active:scale-95 duration-200 text-on-surface-variant flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100"
        >
          <ng-icon name="lucideSearch" class="text-xl"></ng-icon>
        </button>
      </div>
    </header>
  `,
})
export class TopAppBarComponent {
  readonly title = input('');
  readonly userImage = input<string>();
  readonly disabled = input(false);
}
