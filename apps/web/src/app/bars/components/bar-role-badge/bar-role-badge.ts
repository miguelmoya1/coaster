import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BarRole } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-bar-role-badge',
  imports: [TranslatePipe],
  template: `
    <div data-testid="bar-role-badge" class="flex items-center gap-2 mt-2">
      <div
        data-testid="bar-role-badge-dot"
        class="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-90"
        [class]="dotColorClass()"
      ></div>
      <span
        data-testid="bar-role-badge-label"
        class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold"
      >
        {{ labelKey() | translate }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarRoleBadge {
  public readonly role = input<BarRole | undefined>(undefined);

  public readonly dotColorClass = computed(() => {
    switch (this.role()) {
      case BarRole.OWNER:
        return 'bg-primary text-primary';
      case BarRole.STAFF:
        return 'bg-orange-500 text-orange-500';
      default:
        return 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)] text-primary';
    }
  });

  public readonly labelKey = computed(() => {
    switch (this.role()) {
      case BarRole.OWNER:
        return 'common.role.owner';
      case BarRole.STAFF:
        return 'common.role.staff';
      default:
        return 'bars.select.operational';
    }
  });
}
