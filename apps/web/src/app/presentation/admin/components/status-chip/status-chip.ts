import { Component, computed, input } from '@angular/core';
import { SubscriptionStatus } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-status-chip',
  imports: [TranslatePipe],
  template: `
    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" [class]="toneClasses()">
      {{ 'admin.subscription_status.' + status().toLowerCase() | translate }}
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class StatusChip {
  public readonly status = input.required<SubscriptionStatus>();

  protected readonly toneClasses = computed(() => {
    switch (this.status()) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-primary/15 text-primary';
      case SubscriptionStatus.TRIALING:
        return 'bg-secondary/15 text-secondary';
      case SubscriptionStatus.PAST_DUE:
      case SubscriptionStatus.UNPAID:
        return 'bg-error/15 text-error';
      case SubscriptionStatus.CANCELED:
      case SubscriptionStatus.EXPIRED:
        return 'bg-error/10 text-error';
      default:
        return 'bg-on-surface/10 text-on-surface-variant';
    }
  });
}
