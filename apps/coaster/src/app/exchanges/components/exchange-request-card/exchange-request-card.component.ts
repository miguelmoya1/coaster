import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSend } from '@ng-icons/lucide';
@Component({
  selector: 'coaster-exchange-request-card',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideSend })],
  template: `
    <div class="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex gap-4">
        <div class="flex flex-col items-center justify-center bg-surface-container h-16 w-16 rounded-2xl border border-outline-variant/20">
          <span class="label-sm font-bold text-on-surface-variant">{{ month() }}</span>
          <span class="title-lg font-black text-primary">{{ day() }}</span>
        </div>
        
        <div class="flex flex-col justify-center">
          <p class="label-sm text-on-surface-variant uppercase font-bold">{{ shiftPeriod() }}</p>
          <h4 class="title-lg font-bold">{{ roleName() }}</h4>
          <p class="body-md text-on-surface-variant">{{ timeRange() }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="label-sm text-on-surface-variant uppercase font-bold">Offered by</p>
          <p class="body-md font-semibold">{{ offeredBy() }}</p>
        </div>
        <button [disabled]="disabled()" class="bg-primary text-on-primary font-semibold px-6 h-12 rounded-full shadow-md hover:shadow-lg hover:bg-primary/90 active:scale-95 active:shadow-sm transition-all uppercase tracking-wide text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100">
          Request <ng-icon name="lucideSend" class="text-lg"></ng-icon>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExchangeRequestCardComponent {
  readonly month = input.required<string>();
  readonly day = input.required<string>();
  readonly shiftPeriod = input.required<string>();
  readonly roleName = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly offeredBy = input.required<string>();
  readonly disabled = input(false);
}
