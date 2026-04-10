import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CoasterBadge } from '../../../shared';

@Component({
  selector: 'coaster-shift-card',
  imports: [CoasterBadge],
  template: `
    <div [class]="'absolute left-0 top-0 w-1 h-full ' + roleColorClass()"></div>

    <div class="flex flex-col">
      <span class="text-primary font-black text-2xl tracking-tighter uppercase">{{ timeRange() }}</span>
      <span class="text-white font-bold title-lg">{{ staffName() }}</span>
      <div class="flex items-center gap-2 mt-1">
        <span coaster-badge variant="neutral">
          {{ roleName() }}
        </span>
      </div>
    </div>

    <div class="w-14 h-14 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
      <img [src]="staffImage()" alt="Staff Portrait" class="w-full h-full object-cover" />
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[tabindex]': 'disabled() ? -1 : 0',
    class:
      'relative overflow-hidden bg-surface-container-high rounded-2xl p-5 flex items-center justify-between group active:scale-95 transition-all cursor-pointer block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly roleName = input.required<string>();
  readonly roleColorClass = input('text-primary bg-primary');
  readonly disabled = input(false);
}
