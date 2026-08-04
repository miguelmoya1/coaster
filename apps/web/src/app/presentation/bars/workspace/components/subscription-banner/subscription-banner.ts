import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bars';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-subscription-banner',
  imports: [MatButton, MatIcon, TranslatePipe],
  template: `
    @if (subStore.isReadOnly()) {
      <div class="flex items-center gap-2.5 min-w-0">
        <mat-icon class="text-secondary shrink-0 text-base sm:text-lg">lock</mat-icon>
        <span class="truncate sm:whitespace-normal">
          {{ 'billing.banner.read_only' | translate }}
        </span>
      </div>
      <button
        type="button"
        mat-flat-button
        color="primary"
        class="rounded-xl! text-xs! shrink-0"
        (click)="planDialogService.open()"
      >
        {{ 'billing.banner.activate_pro' | translate }}
      </button>
    } @else if (subStore.isTrialExpiringSoon()) {
      <div class="flex items-center gap-2.5 min-w-0">
        <mat-icon class="text-primary shrink-0 text-base sm:text-lg">timer</mat-icon>
        <span class="truncate sm:whitespace-normal">
          @if (subStore.trialDaysRemaining() === 1) {
            {{ 'billing.banner.trial_expiring_one' | translate }}
          } @else {
            {{ 'billing.banner.trial_expiring_other' | translate: { days: subStore.trialDaysRemaining() } }}
          }
        </span>
      </div>
      <button type="button" mat-stroked-button class="rounded-xl! text-xs! shrink-0" (click)="planDialogService.open()">
        {{ 'billing.banner.view_plans' | translate }}
      </button>
    }
  `,
  host: {
    '[class.hidden]': '!subStore.isReadOnly() && !subStore.isTrialExpiringSoon()',
    '[class.bg-secondary/10]': 'subStore.isReadOnly()',
    '[class.border-secondary/20]': 'subStore.isReadOnly()',
    '[class.bg-primary/10]': '!subStore.isReadOnly() && subStore.isTrialExpiringSoon()',
    '[class.border-primary/20]': '!subStore.isReadOnly() && subStore.isTrialExpiringSoon()',
    class:
      'flex items-center justify-between gap-3 sm:gap-4 mx-4 sm:mx-6 my-2 px-4 py-2.5 rounded-xl border text-on-surface text-xs sm:text-sm font-medium transition-all animate-in fade-in duration-300',
  },
})
export class SubscriptionBanner {
  protected readonly subStore = inject(BarSubscriptionStore);
  protected readonly planDialogService = inject(PlanDialogService);
}
