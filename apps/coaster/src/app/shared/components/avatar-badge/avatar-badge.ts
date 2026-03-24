import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'coaster-avatar-badge',
  template: `
    <div
      [class]="
        'rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20 overflow-hidden ' +
        sizeClass()
      "
    >
      <img
        [src]="imageSrc()"
        [alt]="altText()"
        class="w-full h-full object-cover"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarBadge {
  readonly imageSrc = input.required<string>();
  readonly altText = input('Avatar');
  readonly sizeClass = input('w-10 h-10');
}
