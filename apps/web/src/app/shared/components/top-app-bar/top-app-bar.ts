import { Toolbar } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarBadge } from '../avatar-badge/avatar-badge';
import { CoasterTitle } from '../typography/typography';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [AvatarBadge, CoasterTitle],
  hostDirectives: [Toolbar],
  host: {
    class:
      'fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-elevated',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-center justify-center gap-6">
      @if (image(); as image) {
        <coaster-avatar-badge [imageSrc]="image" altText="User profile" />
      }

      <h1 coaster-title>{{ label() }}</h1>
    </header>
  `,
})
export class TopAppBar {
  readonly label = input.required<string>();
  readonly image = input.required<string>();
}
