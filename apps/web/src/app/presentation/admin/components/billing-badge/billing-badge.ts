import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { BarBillingSource } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-billing-badge',
  imports: [MatIcon, TranslatePipe],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
      [class]="toneClasses()"
    >
      <mat-icon class="text-[14px] w-3.5 h-3.5 leading-none">{{ icon() }}</mat-icon>
      {{ 'admin.billing_source.' + source().toLowerCase() | translate }}
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class BillingBadge {
  public readonly source = input.required<BarBillingSource>();

  protected readonly icon = computed(() => {
    switch (this.source()) {
      case 'MANUAL':
        return 'volunteer_activism';
      case 'STRIPE':
        return 'credit_card';
      default:
        return 'lock';
    }
  });

  protected readonly toneClasses = computed(() => {
    switch (this.source()) {
      case 'MANUAL':
        return 'bg-tertiary/15 text-tertiary';
      case 'STRIPE':
        return 'bg-primary/15 text-primary';
      default:
        return 'bg-on-surface/10 text-on-surface-variant';
    }
  });
}
