import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBadge, CoasterBtn } from '../../../shared';

@Component({
  selector: 'coaster-shift-card',
  imports: [CoasterBadge, CoasterBtn, NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideRepeat2 })],
  template: `
    <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0">
      <img [src]="staffImage()" alt="Staff Portrait" class="w-full h-full object-cover" />
    </div>

    <div class="flex flex-col flex-1">
      <span class="text-primary font-black text-2xl tracking-tighter uppercase">{{ timeRange() }}</span>
      <span class="text-white font-bold title-lg">{{ staffName() }}</span>
      <div class="flex items-center gap-2 mt-1">
        <span coaster-badge variant="neutral">
          {{ roleName() }}
        </span>
      </div>
    </div>

    @if (isOwn()) {
      <button
        coaster-btn
        variant="outline"
        class="w-auto! h-12! px-4 shrink-0"
        [disabled]="disabled() || hasPendingExchange()"
        (click)="offerExchange.emit(); $event.stopPropagation()"
      >
        <ng-icon name="lucideRepeat2" class="text-base" />
        @if (hasPendingExchange()) {
          {{ 'roster.exchange_pending' | translate }}
        } @else {
          {{ 'roster.offer_exchange' | translate }}
        }
      </button>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    class:
      'relative overflow-hidden bg-surface-container-high rounded-2xl p-5 flex items-center gap-4 block',
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
  readonly isOwn = input(false);
  readonly hasPendingExchange = input(false);
  readonly offerExchange = output<void>();
}
